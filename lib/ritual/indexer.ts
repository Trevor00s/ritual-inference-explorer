import {
  JOB_ADDED_TOPIC0,
  SYSTEM,
  getPrecompileOrUnknown,
  normAddr,
} from "./constants";
import {
  getBlockNumber,
  getBlockTimestamp,
  getLogs,
  getReceipt,
  getTx,
  type RawLog,
  type RawReceipt,
} from "./client";
import { decodeCall } from "./decode";
import { formatEther, formatGwei } from "viem";
import type { FeedResponse, InferenceRecord, TxDetail, TxOverview } from "./types";

const MAX_CHUNK = 3000; // RPC eth_getLogs range cap (90k => 504; 3k is safe)

/* ------------------------- small concurrency map ------------------------- */
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/* ------------------------------- caches ------------------------------- */
const receiptCache = new Map<string, RawReceipt | null>();
const recordCache = new Map<string, InferenceRecord>();

async function cachedReceipt(hash: string, signal?: AbortSignal): Promise<RawReceipt | null> {
  if (receiptCache.has(hash)) return receiptCache.get(hash)!;
  const r = await getReceipt(hash, signal).catch(() => null);
  if (receiptCache.size > 2000) receiptCache.clear();
  receiptCache.set(hash, r);
  return r;
}

/* ------------------------- resolve a single job ------------------------- */
function pickSpc(receipt: RawReceipt | null, precompile: string) {
  const calls = receipt?.spcCalls ?? [];
  if (calls.length === 0) return undefined;
  return calls.find((c) => normAddr(c.address) === precompile) ?? calls[0];
}

async function resolveFromJobLog(log: RawLog, signal?: AbortSignal): Promise<InferenceRecord> {
  const systemTx = log.transactionHash;
  if (recordCache.has(systemTx)) return recordCache.get(systemTx)!;

  const precompileAddress = normAddr(log.topics[3] ?? "");
  const meta = getPrecompileOrUnknown(precompileAddress);
  const sender = log.topics[1] ? normAddr(log.topics[1]) : null;
  const jobId = log.topics[2] ?? null;
  const blockNumber = Number(BigInt(log.blockNumber));

  const sysReceipt = await cachedReceipt(systemTx, signal);
  const originalTx = sysReceipt?.originalTx ?? null;

  // The originalTx (user tx, type 0x2) carries spcCalls; the JobAdded log lives in
  // the type-0x11 system tx that references it.
  let origReceipt: RawReceipt | null = sysReceipt;
  if (!(sysReceipt?.spcCalls && sysReceipt.spcCalls.length) && originalTx) {
    origReceipt = await cachedReceipt(originalTx, signal);
  }

  const spc = pickSpc(origReceipt, precompileAddress);
  const inputHex = spc?.input ?? sysReceipt?.precompileInput ?? null;
  const outputHex = spc?.output ?? null;
  const proof = spc?.proof ?? null;

  const timestamp = await getBlockTimestamp(log.blockNumber, signal).catch(() => null);
  const decoded = decodeCall(precompileAddress, inputHex, outputHex);

  const record: InferenceRecord = {
    precompileAddress,
    precompileKey: meta.key,
    precompileLabel: meta.label,
    badge: meta.badge,
    glyph: meta.glyph,
    kind: meta.kind,
    group: meta.group,
    accent: meta.accent,
    jobId,
    sender: origReceipt?.from ? normAddr(origReceipt.from) : sender,
    consumer: origReceipt?.to ? normAddr(origReceipt.to) : null,
    originalTx: originalTx ?? (origReceipt === sysReceipt ? systemTx : null),
    systemTx,
    commitmentTx: origReceipt?.commitmentTx ?? null,
    settlementTx: origReceipt?.settlementTx ?? null,
    blockNumber,
    timestamp,
    inputHex,
    outputHex,
    proof,
    decoded,
  };

  if (recordCache.size > 1500) recordCache.clear();
  recordCache.set(systemTx, record);
  return record;
}

/* ------------------------------- feed ------------------------------- */
export interface FeedOptions {
  limit?: number;
  blocks?: number;
  precompileKey?: string | null;
  search?: string | null;
  signal?: AbortSignal;
}

export async function getFeed(opts: FeedOptions = {}): Promise<FeedResponse> {
  const limit = Math.min(opts.limit ?? 30, 80);
  const blocks = Math.min(opts.blocks ?? MAX_CHUNK, MAX_CHUNK);
  const signal = opts.signal;

  const latest = await getBlockNumber(signal);
  const fromBlock = Math.max(0, latest - blocks);

  const logs = await getLogs(
    { address: SYSTEM.ASYNC_JOB_TRACKER, topics: [JOB_ADDED_TOPIC0], fromBlock, toBlock: latest },
    signal,
  );

  // counts across the whole window (for the stats bar)
  const counts: Record<string, number> = {};
  for (const l of logs) {
    const k = getPrecompileOrUnknown(normAddr(l.topics[3] ?? "")).key;
    counts[k] = (counts[k] ?? 0) + 1;
  }

  // newest first; optionally filter by precompile
  let selected = [...logs].sort((a, b) => Number(BigInt(b.blockNumber) - BigInt(a.blockNumber)));
  if (opts.precompileKey) {
    selected = selected.filter((l) => getPrecompileOrUnknown(normAddr(l.topics[3] ?? "")).key === opts.precompileKey);
  }
  // resolve a bounded number (search may need a few extra to fill the page)
  const resolveCount = opts.search ? Math.min(selected.length, limit * 4) : Math.min(selected.length, limit);
  const sliced = selected.slice(0, resolveCount);

  let records = await mapLimit(sliced, 6, (l) => resolveFromJobLog(l, signal));

  if (opts.search) {
    const q = opts.search.toLowerCase();
    records = records.filter((r) =>
      [r.decoded.title, r.decoded.promptPreview, r.decoded.answerPreview, r.decoded.model, r.sender, r.consumer, r.originalTx, r.precompileLabel]
        .filter(Boolean)
        .some((s) => (s as string).toLowerCase().includes(q)),
    );
  }

  return { records: records.slice(0, limit), fromBlock, toBlock: latest, scannedAt: Date.now(), counts };
}

/* --------------------------- single tx lookup --------------------------- */
export async function getRecordsByTx(hash: string, signal?: AbortSignal): Promise<InferenceRecord[]> {
  const receipt = await cachedReceipt(hash, signal);
  // null = the public RPC node has no record of this tx. Because that node is
  // non-archival, older transactions get pruned and can't be fetched here
  // (the official explorer keeps full history via its own index).
  if (!receipt) {
    throw new Error("PRUNED");
  }

  // Resolve to the tx that carries spcCalls.
  let origReceipt: RawReceipt | null = receipt;
  let originalTx: string | null = receipt.originalTx ?? null;
  if (!(receipt.spcCalls && receipt.spcCalls.length) && originalTx) {
    origReceipt = await cachedReceipt(originalTx, signal);
  } else if (receipt.spcCalls && receipt.spcCalls.length) {
    originalTx = hash;
  }

  const ts = await getBlockTimestamp(origReceipt?.blockNumber ?? receipt.blockNumber, signal).catch(() => null);
  const calls = origReceipt?.spcCalls ?? [];

  if (calls.length === 0) {
    // No spcCalls yet (long-running, output via callback): still decode the input
    // from precompileInput if present.
    if (receipt.precompileInput && receipt.precompileAddress) {
      const pa = normAddr(receipt.precompileAddress);
      const meta = getPrecompileOrUnknown(pa);
      return [
        {
          precompileAddress: pa,
          precompileKey: meta.key,
          precompileLabel: meta.label,
          badge: meta.badge,
          glyph: meta.glyph,
          kind: meta.kind,
          group: meta.group,
          accent: meta.accent,
          jobId: null,
          sender: origReceipt?.from ? normAddr(origReceipt.from) : null,
          consumer: origReceipt?.to ? normAddr(origReceipt.to) : null,
          originalTx,
          systemTx: hash,
          commitmentTx: origReceipt?.commitmentTx ?? null,
          settlementTx: origReceipt?.settlementTx ?? null,
          blockNumber: Number(BigInt(receipt.blockNumber)),
          timestamp: ts,
          inputHex: receipt.precompileInput,
          outputHex: null,
          proof: null,
          decoded: decodeCall(pa, receipt.precompileInput, null),
        },
      ];
    }
    return [];
  }

  return calls.map((c) => {
    const pa = normAddr(c.address);
    const meta = getPrecompileOrUnknown(pa);
    return {
      precompileAddress: pa,
      precompileKey: meta.key,
      precompileLabel: meta.label,
      badge: meta.badge,
      glyph: meta.glyph,
      kind: meta.kind,
      group: meta.group,
      accent: meta.accent,
      jobId: null,
      sender: origReceipt?.from ? normAddr(origReceipt.from) : null,
      consumer: origReceipt?.to ? normAddr(origReceipt.to) : null,
      originalTx,
      systemTx: origReceipt === receipt ? null : hash,
      commitmentTx: origReceipt?.commitmentTx ?? null,
      settlementTx: origReceipt?.settlementTx ?? null,
      blockNumber: Number(BigInt(origReceipt?.blockNumber ?? receipt.blockNumber)),
      timestamp: ts,
      inputHex: c.input,
      outputHex: c.output,
      proof: c.proof,
      decoded: decodeCall(pa, c.input, c.output),
    };
  });
}


/* --------------------------- tx overview --------------------------- */
const TX_TYPE_LABELS: Record<string, string> = {
  "0x0": "Legacy",
  "0x1": "Access List",
  "0x2": "EIP-1559",
  "0x10": "Scheduled",
  "0x11": "Async (system)",
  "0x77": "Passkey (WebAuthn)",
};

function safeBig(hex?: string | null): bigint {
  try {
    return hex ? BigInt(hex) : 0n;
  } catch {
    return 0n;
  }
}

async function buildOverview(hash: string, signal?: AbortSignal): Promise<TxOverview> {
  const [tx, receipt] = await Promise.all([
    getTx(hash, signal).catch(() => null),
    cachedReceipt(hash, signal),
  ]);
  const blockHex = receipt?.blockNumber ?? tx?.blockNumber ?? null;
  const timestamp = blockHex ? await getBlockTimestamp(blockHex, signal).catch(() => null) : null;
  const typeHex = (receipt?.type ?? tx?.type ?? "").toLowerCase();
  const gasUsed = safeBig(receipt?.gasUsed);
  const gasPrice = safeBig(receipt?.effectiveGasPrice ?? tx?.gasPrice);
  const fromAddr = receipt?.from ?? tx?.from ?? null;
  const toAddr = receipt?.to ?? tx?.to ?? null;
  return {
    hash,
    status: receipt?.status === "0x1" ? "success" : "failed",
    typeHex,
    typeLabel: TX_TYPE_LABELS[typeHex] ?? (typeHex || "—"),
    blockNumber: blockHex ? Number(safeBig(blockHex)) : null,
    timestamp,
    from: fromAddr ? normAddr(fromAddr) : null,
    to: toAddr ? normAddr(toAddr) : null,
    valueRitual: formatEther(safeBig(tx?.value)),
    nonce: tx?.nonce != null ? Number(safeBig(tx.nonce)) : null,
    gasUsed: gasUsed.toString(),
    gasPriceGwei: formatGwei(gasPrice),
    feeRitual: formatEther(gasUsed * gasPrice),
    logsCount: receipt?.logs?.length ?? 0,
    originalTx: receipt?.originalTx ?? null,
    commitmentTx: receipt?.commitmentTx ?? null,
    settlementTx: receipt?.settlementTx ?? null,
  };
}

/** Full detail for the tx page: standard tx overview + decoded inference records. */
export async function getTxDetail(hash: string, signal?: AbortSignal): Promise<TxDetail> {
  const records = await getRecordsByTx(hash, signal); // throws "PRUNED" if the node has no receipt
  const overview = await buildOverview(hash, signal);
  return { overview, records };
}
