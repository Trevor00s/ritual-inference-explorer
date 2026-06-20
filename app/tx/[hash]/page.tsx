import Link from "next/link";
import { getRecordsByTx } from "@/lib/ritual/indexer";
import { Header } from "@/components/Header";
import { RecordDetail } from "@/components/RecordDetail";
import { explorerTx } from "@/lib/format";
import type { InferenceRecord } from "@/lib/ritual/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function TxPage({ params }: { params: { hash: string } }) {
  const hash = params.hash;
  let records: InferenceRecord[] = [];
  let error: string | null = null;

  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    error = "Invalid transaction hash.";
  } else {
    try {
      records = await getRecordsByTx(hash);
    } catch (e: any) {
      error = e?.message ?? "lookup failed";
    }
  }

  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Link href="/" className="text-xs text-gray-500 transition-colors hover:text-ritual-lime">
          ← back to feed
        </Link>
        <div className="mb-5 mt-2 break-all font-mono text-xs text-gray-500">{hash}</div>

        {error && (
          <div className="rounded-lg border border-ritual-red/40 bg-ritual-red/10 p-4 text-sm text-ritual-red">{error}</div>
        )}

        {!error && records.length === 0 && (
          <div className="rounded-lg border border-gray-700/60 bg-ritual-elevated/40 p-8 text-center text-sm text-gray-400">
            No precompile (inference) call found for this transaction.
            <div className="mt-2 text-xs text-gray-600">
              It may contain no async precompile call, or the testnet node may have pruned it.{" "}
              <a href={explorerTx(hash)} target="_blank" rel="noreferrer" className="text-ritual-lime hover:underline">
                View on the chain explorer ↗
              </a>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {records.map((r, i) => (
            <RecordDetail key={`${r.precompileAddress}-${i}`} r={r} />
          ))}
        </div>
      </div>
    </main>
  );
}
