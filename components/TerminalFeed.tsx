"use client";

import Link from "next/link";
import type { InferenceRecord } from "@/lib/ritual/types";
import { ACCENT_HEX } from "@/lib/ritual/constants";
import { shortAddr, timeAgo } from "@/lib/format";

function statusMark(r: InferenceRecord) {
  if (r.decoded.hasError) return { t: "✕ REVERT", c: "#EF4444" };
  if (r.decoded.encryptedOutput) return { t: "🔒 ENC", c: "#FF1DCE" };
  if (r.decoded.outputViaCallback) return { t: "◷ CALLBACK", c: "#FACC15" };
  if (r.proof) return { t: "✓ PROOF", c: "#19D184" };
  return { t: "· OK", c: "#9CA3AF" };
}

export function TerminalFeed({ records, loading }: { records: InferenceRecord[]; loading?: boolean }) {
  if (loading && records.length === 0) {
    return (
      <div className="term px-3 py-2 text-xs text-gray-600">
        <p className="neon-cyan">booting inference monitor…</p>
        <p className="mt-1 term-cursor">scanning AsyncJobTracker</p>
      </div>
    );
  }
  if (records.length === 0) {
    return <div className="term px-3 py-6 text-center text-xs text-gray-600">no inference calls in window — adjust filter</div>;
  }

  return (
    <div className="term divide-y divide-white/5">
      {records.map((r) => {
        const hex = ACCENT_HEX[r.accent] ?? "#00e5ff";
        const tx = r.originalTx ?? r.systemTx ?? "";
        const st = statusMark(r);
        return (
          <Link
            key={`${tx}-${r.precompileAddress}-${r.blockNumber}`}
            href={tx ? `/tx?hash=${tx}` : "#"}
            className="row-in block px-3 py-2 text-xs leading-relaxed transition-colors hover:bg-white/5"
          >
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-gray-600 tabular">{r.blockNumber?.toLocaleString() ?? "—"}</span>
              <span style={{ color: hex, textShadow: `0 0 6px ${hex}80` }}>
                {r.glyph} {r.badge}
              </span>
              {r.decoded.model && <span className="truncate text-gray-500">{r.decoded.model}</span>}
              <span className="ml-auto whitespace-nowrap" style={{ color: st.c }}>
                {st.t}
              </span>
            </div>
            <div className="mt-0.5 truncate text-gray-300">
              <span className="text-gray-600">› </span>
              {r.decoded.promptPreview || r.decoded.title}
            </div>
            {r.decoded.answerPreview && (
              <div className="truncate" style={{ color: hex }}>
                <span className="text-gray-600">→ </span>
                {r.decoded.answerPreview}
              </div>
            )}
            <div className="mt-0.5 text-[10px] text-gray-600">
              {shortAddr(r.sender)} · {timeAgo(r.timestamp)}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
