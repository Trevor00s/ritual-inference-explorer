"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { RecordDetail } from "@/components/RecordDetail";
import { getRecordsByTx } from "@/lib/ritual/indexer";
import { explorerTx } from "@/lib/format";

function TxView() {
  const params = useSearchParams();
  const hash = params.get("hash") ?? "";
  const valid = /^0x[0-9a-fA-F]{64}$/.test(hash);

  const query = useQuery({
    queryKey: ["tx", hash],
    queryFn: () => getRecordsByTx(hash),
    enabled: valid,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link href="/" className="text-xs text-gray-500 transition-colors hover:text-ritual-lime">
        ← back to feed
      </Link>
      <div className="mb-5 mt-2 break-all font-mono text-xs text-gray-500">{hash || "—"}</div>

      {!valid && (
        <div className="rounded-lg border border-ritual-red/40 bg-ritual-red/10 p-4 text-sm text-ritual-red">
          Invalid transaction hash.
        </div>
      )}

      {valid && query.isLoading && (
        <div className="term px-1 py-6 text-xs text-gray-500">
          <p className="neon-cyan">decoding transaction…</p>
          <p className="mt-1 term-cursor">reading spcCalls</p>
        </div>
      )}

      {valid && query.isError && (
        <div className="rounded-lg border border-ritual-red/40 bg-ritual-red/10 p-4 text-sm text-ritual-red">
          {(query.error as Error)?.message ?? "lookup failed"}
        </div>
      )}

      {valid && query.isSuccess && query.data.length === 0 && (
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
        {query.data?.map((r, i) => (
          <RecordDetail key={`${r.precompileAddress}-${i}`} r={r} />
        ))}
      </div>
    </div>
  );
}

export default function TxPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-6 text-xs text-gray-600">loading…</div>}>
        <TxView />
      </Suspense>
    </main>
  );
}
