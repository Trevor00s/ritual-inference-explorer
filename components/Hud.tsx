"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FeedResponse } from "@/lib/ritual/types";
import { huntField } from "@/lib/hunt";

export function Hud({ feed, live }: { feed?: FeedResponse; live: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const total = feed ? Object.values(feed.counts).reduce((a, b) => a + b, 0) : 0;

  const [kills, setKills] = useState(0);
  useEffect(() => {
    setKills(huntField.kills);
    return huntField.subscribe(() => setKills(huntField.kills));
  }, []);

  const tickerItems =
    feed?.records
      .map((r) => `${r.glyph} ${r.badge} ${r.decoded.model ?? ""} › ${r.decoded.promptPreview ?? r.decoded.title}`)
      .slice(0, 18) ?? [];

  function go(e: React.FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (/^0x[0-9a-fA-F]{64}$/.test(v)) router.push(`/tx/${v}`);
  }

  return (
    <header className="term z-30 border-b border-white/10 bg-black/80">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2">
          <span className="neon-pink">◇</span>
          <span className="font-display text-sm font-extrabold uppercase tracking-[0.22em] text-gray-100">
            Ritual<span className="text-gray-600">//</span><span className="neon-cyan">INFERENCE_TERMINAL</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <span>
            chain <span className="neon-cyan">1979</span>
          </span>
          {feed && (
            <span>
              block <span className="text-gray-300 tabular">{feed.toBlock.toLocaleString()}</span>
            </span>
          )}
          {feed && (
            <span>
              <span className="neon-green tabular">{total}</span> calls/window
            </span>
          )}
          <span title="pending txs verified by the lizard, in order">
            🦎 <span className="neon-pink tabular">{kills}</span> verified
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: live ? "#19D184" : "#6B7280", boxShadow: live ? "0 0 8px #19D184" : "none" }}
            />
            {live ? "LIVE" : "PAUSED"}
          </span>
        </div>

        <form onSubmit={go} className="ml-auto">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="› tx hash 0x…"
            className="w-48 rounded border border-white/15 bg-black/60 px-2 py-1 font-mono text-[11px] text-gray-200 outline-none focus:border-ritual-green"
          />
        </form>
      </div>

      {/* ticker */}
      <div className="overflow-hidden border-t border-white/5 bg-black/60 py-1">
        <div className="ticker-track text-[11px] text-gray-500">
          {[...tickerItems, ...tickerItems].map((t, i) => (
            <span key={i} className="mx-6">
              <span className="text-gray-700">▪</span> {t}
            </span>
          ))}
          {tickerItems.length === 0 && <span className="mx-6 neon-cyan">initializing live inference stream…</span>}
        </div>
      </div>
    </header>
  );
}
