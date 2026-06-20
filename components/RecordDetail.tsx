import Link from "next/link";
import type { InferenceRecord, KV } from "@/lib/ritual/types";
import { accentHex, explorerAddr, explorerTx, maybePrettyJson, shortHash, timeAgo } from "@/lib/format";
import { Badge, KindTag, ProofChip } from "./ui";
import { CopyButton } from "./ui";

function KVRow({ kv }: { kv: KV }) {
  let body: React.ReactNode;
  if (kv.kind === "json") {
    body = (
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-black/50 p-3 font-mono text-xs text-gray-300">
        {maybePrettyJson(kv.value)}
      </pre>
    );
  } else if (kv.kind === "url") {
    body = (
      <a href={kv.value} target="_blank" rel="noreferrer" className="break-all font-mono text-sm text-ritual-lime hover:underline">
        {kv.value}
      </a>
    );
  } else if (kv.kind === "address") {
    body = (
      <a href={explorerAddr(kv.value)} target="_blank" rel="noreferrer" className="break-all font-mono text-sm text-gray-300 hover:text-ritual-lime">
        {kv.value}
      </a>
    );
  } else {
    body = (
      <p className={`whitespace-pre-wrap break-words text-sm text-gray-300 ${kv.mono ? "font-mono" : ""}`}>{kv.value}</p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-1 py-2 sm:grid-cols-[140px_1fr] sm:gap-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{kv.label}</div>
      <div>{body}</div>
    </div>
  );
}

function Section({ title, accentHexColor, children }: { title: string; accentHexColor?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-700/70 bg-ritual-elevated/50">
      <div className="border-b border-gray-800 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: accentHexColor ?? "#9CA3AF" }}>
        {title}
      </div>
      <div className="divide-y divide-gray-800/70 px-4">{children}</div>
    </div>
  );
}

function TxLink({ label, hash }: { label: string; hash?: string | null }) {
  if (!hash) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 text-gray-500">{label}</span>
      <Link href={`/tx?hash=${hash}`} className="font-mono text-gray-300 hover:text-ritual-lime">
        {shortHash(hash, 10)}
      </Link>
      <a href={explorerTx(hash)} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-ritual-green" title="View on explorer">
        ↗
      </a>
    </div>
  );
}

export function RecordDetail({ r }: { r: InferenceRecord }) {
  const hex = accentHex(r.accent);
  return (
    <div className="space-y-4">
      {/* header */}
      <div className="rounded-xl border border-gray-700/70 bg-ritual-elevated/60 p-4" style={r.group === "ai" ? { borderTop: `2px solid ${hex}66` } : undefined}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge glyph={r.glyph} label={r.badge} accent={r.accent} />
          <KindTag kind={r.kind} />
          <ProofChip proof={r.proof} encrypted={r.decoded.encryptedOutput} callback={r.decoded.outputViaCallback} hasError={r.decoded.hasError} />
          <span className="ml-auto text-xs text-gray-500">{timeAgo(r.timestamp)}</span>
        </div>
        <h2 className="mt-3 text-lg leading-snug text-gray-100">{r.decoded.title}</h2>
        {r.decoded.model && <p className="mt-1 font-mono text-xs text-gray-500">{r.decoded.model}</p>}

        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          {r.sender && (
            <div className="flex items-center gap-2 text-xs">
              <span className="w-24 text-gray-500">Sender (EOA)</span>
              <a href={explorerAddr(r.sender)} target="_blank" rel="noreferrer" className="font-mono text-gray-300 hover:text-ritual-lime">
                {shortHash(r.sender, 8)}
              </a>
            </div>
          )}
          {r.consumer && (
            <div className="flex items-center gap-2 text-xs">
              <span className="w-24 text-gray-500">Consumer</span>
              <a href={explorerAddr(r.consumer)} target="_blank" rel="noreferrer" className="font-mono text-gray-300 hover:text-ritual-lime">
                {shortHash(r.consumer, 8)}
              </a>
            </div>
          )}
          {r.blockNumber != null && (
            <div className="flex items-center gap-2 text-xs">
              <span className="w-24 text-gray-500">Block</span>
              <span className="tabular font-mono text-gray-300">{r.blockNumber.toLocaleString()}</span>
            </div>
          )}
          <TxLink label="Original tx" hash={r.originalTx} />
          <TxLink label="Commitment tx" hash={r.commitmentTx} />
          <TxLink label="Settlement tx" hash={r.settlementTx} />
        </div>
      </div>

      {/* request */}
      <Section title="Input — what the contract asked" accentHexColor={hex}>
        {r.decoded.request.length ? r.decoded.request.map((kv, i) => <KVRow key={i} kv={kv} />) : <p className="py-3 text-sm text-gray-500">No decoded input.</p>}
      </Section>

      {/* response */}
      <Section title="Output — what the TEE returned" accentHexColor="#19D184">
        {r.decoded.outputViaCallback ? (
          <p className="py-3 text-sm text-gray-400">
            Long-running precompile — the result is delivered later via a Phase-2 callback from AsyncDelivery
            (<span className="font-mono">0x5A16…39F6</span>), not in this transaction&apos;s receipt.
          </p>
        ) : r.decoded.encryptedOutput ? (
          <p className="py-3 text-sm text-gray-400">
            🔒 Output is ECIES-encrypted to the caller&apos;s public key. It is verifiable (TEE-attested) but only
            the holder of the private key can read the plaintext.
          </p>
        ) : r.decoded.response && r.decoded.response.length ? (
          r.decoded.response.map((kv, i) => <KVRow key={i} kv={kv} />)
        ) : (
          <p className="py-3 text-sm text-gray-500">No decoded output.</p>
        )}
      </Section>

      {/* proof */}
      {r.proof && (
        <Section title="TEE attestation proof" accentHexColor="#19D184">
          <div className="py-3">
            <div className="mb-1 flex items-center gap-3 text-xs text-gray-500">
              <span>Each result is cryptographically bound to its request by the executor enclave.</span>
              <CopyButton value={r.proof} label="copy proof" />
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-black/50 p-3 font-mono text-xs text-ritual-green">{r.proof}</pre>
          </div>
        </Section>
      )}

      {/* raw */}
      <details className="rounded-xl border border-gray-700/70 bg-ritual-elevated/50">
        <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Raw ABI payloads
        </summary>
        <div className="space-y-3 px-4 pb-4">
          {r.inputHex && (
            <div>
              <div className="mb-1 flex items-center gap-3 text-xs text-gray-500">
                <span>input</span>
                <CopyButton value={r.inputHex} />
              </div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-md bg-black/50 p-3 font-mono text-[11px] text-gray-500">{r.inputHex}</pre>
            </div>
          )}
          {r.outputHex && (
            <div>
              <div className="mb-1 flex items-center gap-3 text-xs text-gray-500">
                <span>output</span>
                <CopyButton value={r.outputHex} />
              </div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-md bg-black/50 p-3 font-mono text-[11px] text-gray-500">{r.outputHex}</pre>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
