import { RPC_URL } from "./constants";

// We use a raw JSON-RPC client (not viem's typed receipt) because Ritual extends
// transaction receipts with non-standard fields — spcCalls, originalTx,
// commitmentTx, settlementTx, precompileAddress, precompileInput — that viem's
// receipt formatter would discard.

export interface SpcCall {
  address: string;
  input: string;
  output: string;
  proof: string;
  blockNumber: number;
}

export interface RawLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
}

export interface RawReceipt {
  transactionHash: string;
  blockNumber: string;
  from: string;
  to: string | null;
  status: string;
  type: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
  cumulativeGasUsed?: string;
  logs?: RawLog[];
  // Ritual extensions:
  spcCalls?: SpcCall[];
  originalTx?: string | null;
  commitmentTx?: string | null;
  settlementTx?: string | null;
  precompileAddress?: string | null;
  precompileInput?: string | null;
}

let _id = 1;

export async function rpc<T = any>(
  method: string,
  params: unknown[],
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: _id++, method, params }),
    signal,
    // never cache RPC reads
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`RPC ${method} HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.error) {
    throw new Error(`RPC ${method} error: ${json.error.message ?? JSON.stringify(json.error)}`);
  }
  return json.result as T;
}

export async function getBlockNumber(signal?: AbortSignal): Promise<number> {
  const hex = await rpc<string>("eth_blockNumber", [], signal);
  return Number(BigInt(hex));
}

export async function getLogs(
  params: { address?: string; topics?: (string | null)[]; fromBlock: number; toBlock: number | "latest" },
  signal?: AbortSignal,
): Promise<RawLog[]> {
  const toBlock = params.toBlock === "latest" ? "latest" : "0x" + params.toBlock.toString(16);
  return rpc<RawLog[]>(
    "eth_getLogs",
    [
      {
        address: params.address,
        topics: params.topics,
        fromBlock: "0x" + params.fromBlock.toString(16),
        toBlock,
      },
    ],
    signal,
  );
}

export async function getReceipt(txHash: string, signal?: AbortSignal): Promise<RawReceipt | null> {
  return rpc<RawReceipt | null>("eth_getTransactionReceipt", [txHash], signal);
}

export interface RawTx {
  hash: string;
  type: string;
  from: string;
  to: string | null;
  value: string;
  nonce: string;
  gas: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  input: string;
  blockNumber: string;
}

export async function getTx(txHash: string, signal?: AbortSignal): Promise<RawTx | null> {
  return rpc<RawTx | null>("eth_getTransactionByHash", [txHash], signal);
}

const _blockTsCache = new Map<string, number>();
export async function getBlockTimestamp(blockNumberHex: string, signal?: AbortSignal): Promise<number | null> {
  if (_blockTsCache.has(blockNumberHex)) return _blockTsCache.get(blockNumberHex)!;
  const block = await rpc<{ timestamp: string } | null>("eth_getBlockByNumber", [blockNumberHex, false], signal);
  if (!block?.timestamp) return null;
  const ts = Number(BigInt(block.timestamp));
  _blockTsCache.set(blockNumberHex, ts);
  return ts;
}
