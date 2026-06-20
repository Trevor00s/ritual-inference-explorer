import Link from "next/link";
import type { TxOverview } from "@/lib/ritual/types";
import { shortHash, timeAgo, explorerTx, explorerAddr } from "@/lib/format";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-2 sm:grid-cols-[150px_1fr] sm:gap-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm text-gray-300">{children}</div>
    </div>
  );
}

function fmtTime(ts: number | null) {
  if (!ts) return "—";
  const ms = ts > 1e12 ? ts : ts * 1000;
  const iso = new Date(ms).toISOString().replace("T", " ").replace(/\..+/, "");
  return `${iso} UTC · ${timeAgo(ts)}`;
}

function TxRef({ label, hash }: { label: string; hash: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 text-gray-600">{label}</span>
      <Link href={`/tx?hash=${hash}`} className="font-mono text-gray-300 hover:text-ritual-lime">
        {shortHash(hash, 10)}
      </Link>
      <a href={explorerTx(hash)} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-ritual-green">
        ↗
      </a>
    </div>
  );
}

export function TxOverviewCard({ o }: { o: TxOverview }) {
  return (
    <div className="rounded-xl border border-gray-700/70 bg-ritual-elevated/50">
      <div className="neon-cyan border-b border-gray-800 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">
        Transaction
      </div>
      <div className="divide-y divide-gray-800/70 px-4">
        <Row label="Status">
          {o.status === "success" ? (
            <span className="text-ritual-green">✓ Success</span>
          ) : (
            <span className="text-ritual-red">✕ Failed</span>
          )}
        </Row>
        <Row label="Type">
          <span className="font-mono">{o.typeLabel}</span> <span className="text-gray-600">({o.typeHex})</span>
        </Row>
        <Row label="Block">
          {o.blockNumber != null ? <span className="tabular font-mono text-gray-300">{o.blockNumber.toLocaleString()}</span> : "—"}
          <span className="ml-2 text-gray-600">{fmtTime(o.timestamp)}</span>
        </Row>
        <Row label="From">
          {o.from ? (
            <a href={explorerAddr(o.from)} target="_blank" rel="noreferrer" className="break-all font-mono text-gray-300 hover:text-ritual-lime">
              {o.from}
            </a>
          ) : (
            "—"
          )}
        </Row>
        <Row label="To">
          {o.to ? (
            <a href={explorerAddr(o.to)} target="_blank" rel="noreferrer" className="break-all font-mono text-gray-300 hover:text-ritual-lime">
              {o.to}
            </a>
          ) : (
            "—"
          )}
        </Row>
        <Row label="Value">
          <span className="font-mono">{o.valueRitual} RITUAL</span>
        </Row>
        <Row label="Gas used">
          <span className="tabular font-mono">{Number(o.gasUsed).toLocaleString()}</span>
        </Row>
        <Row label="Gas price">
          <span className="font-mono">{o.gasPriceGwei} gwei</span>
        </Row>
        <Row label="Tx fee">
          <span className="font-mono text-ritual-lime">{o.feeRitual} RITUAL</span>
        </Row>
        <Row label="Nonce">{o.nonce ?? "—"}</Row>
        <Row label="Event logs">{o.logsCount}</Row>
        {(o.originalTx || o.commitmentTx || o.settlementTx) && (
          <Row label="Async lifecycle">
            <div className="space-y-1 text-xs">
              {o.originalTx && <TxRef label="original" hash={o.originalTx} />}
              {o.commitmentTx && <TxRef label="commitment" hash={o.commitmentTx} />}
              {o.settlementTx && <TxRef label="settlement" hash={o.settlementTx} />}
            </div>
          </Row>
        )}
      </div>
    </div>
  );
}
