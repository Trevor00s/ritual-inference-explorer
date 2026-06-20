"use client";

import Link from "next/link";
import type { InferenceRecord } from "@/lib/ritual/types";
import { accentHex, shortAddr, timeAgo } from "@/lib/format";
import { AccentDot, Badge, KindTag, ProofChip } from "./ui";

export function InferenceCard({ r }: { r: InferenceRecord }) {
  const hex = accentHex(r.accent);
  const txHash = r.originalTx ?? r.systemTx ?? "";
  const isAI = r.group === "ai";

  return (
    <Link
      href={txHash ? `/tx/${txHash}` : "#"}
      className="block animate-fade-in rounded-xl border border-gray-700/70 bg-ritual-elevated/60 p-4 transition-all hover:border-gray-500 hover:bg-ritual-elevated"
      style={isAI ? { borderTop: `2px solid ${hex}55` } : undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AccentDot accent={r.accent} pulse={r.kind === "long"} />
          <Badge glyph={r.glyph} label={r.badge} accent={r.accent} />
          <KindTag kind={r.kind} />
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <ProofChip
            proof={r.proof}
            encrypted={r.decoded.encryptedOutput}
            callback={r.decoded.outputViaCallback}
            hasError={r.decoded.hasError}
          />
          <span className="tabular">{timeAgo(r.timestamp)}</span>
        </div>
      </div>

      <div className="mt-3">
        <p className="line-clamp-2 text-[15px] leading-snug text-gray-200">{r.decoded.title || r.precompileLabel}</p>
        {r.decoded.answerPreview ? (
          <p className="mt-1 line-clamp-2 text-sm" style={{ color: hex }}>
            <span className="text-gray-600">→ </span>
            {r.decoded.answerPreview}
          </p>
        ) : r.decoded.model ? (
          <p className="mt-1 font-mono text-xs text-gray-500">{r.decoded.model}</p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-gray-500">
        <span>
          from <span className="text-gray-400">{shortAddr(r.sender)}</span>
        </span>
        {r.consumer && (
          <span>
            via <span className="text-gray-400">{shortAddr(r.consumer)}</span>
          </span>
        )}
        {r.blockNumber != null && <span className="tabular">block {r.blockNumber.toLocaleString()}</span>}
      </div>
    </Link>
  );
}
