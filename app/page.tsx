"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Hud } from "@/components/Hud";
import { NeuralCanvas } from "@/components/NeuralCanvas";
import { TerminalFeed } from "@/components/TerminalFeed";
import { Controls } from "@/components/Controls";
import type { FeedResponse } from "@/lib/ritual/types";

async function fetchFeed(filter: string | null, search: string): Promise<FeedResponse> {
  const p = new URLSearchParams({ limit: "40", blocks: "3000" });
  if (filter) p.set("precompile", filter);
  if (search) p.set("q", search);
  const res = await fetch(`/api/feed?${p.toString()}`);
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "feed error");
  return res.json();
}

export default function TerminalPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [live, setLive] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const query = useQuery({
    queryKey: ["feed", filter, search],
    queryFn: () => fetchFeed(filter, search),
    refetchInterval: live ? 5000 : false,
  });
  const data = query.data;

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-black text-gray-300 term">
      <Hud feed={data} live={live} />

      <section className="scanlines grid-bg relative flex-1 overflow-hidden">
        <NeuralCanvas records={data?.records ?? []} />

        {/* left terminal panel (glass, canvas glows behind) */}
        <div className="absolute inset-y-0 left-0 flex w-full max-w-md flex-col border-r border-white/10 bg-black/70 backdrop-blur-sm sm:w-[44%]">
          <div className="space-y-2 border-b border-white/10 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
                live inference log
              </span>
              <button
                onClick={() => setLive((v) => !v)}
                className="rounded border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wider"
                style={{ color: live ? "#19D184" : "#9CA3AF" }}
              >
                {live ? "● live" : "○ paused"}
              </button>
            </div>
            <Controls
              search={searchInput}
              onSearch={setSearchInput}
              active={filter}
              onFilter={setFilter}
              counts={data?.counts ?? {}}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {query.isError ? (
              <div className="p-3 text-xs text-ritual-red">
                ✕ rpc error: {(query.error as Error)?.message}. retrying…
              </div>
            ) : (
              <TerminalFeed records={data?.records ?? []} loading={query.isLoading} />
            )}
          </div>

          <div className="border-t border-white/10 px-3 py-1.5 text-[10px] text-gray-600">
            read-only · AsyncJobTracker + receipt.spcCalls · ~350ms blocks
          </div>
        </div>

        {/* pipeline legend (over canvas, right side) */}
        <div className="pointer-events-none absolute bottom-3 right-3 hidden rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-[10px] text-gray-500 backdrop-blur-sm sm:block">
          <div className="mb-1 uppercase tracking-widest text-gray-600">TEE pipeline</div>
          <div className="font-mono neon-cyan">SUBMIT→COMMIT→TEE·EXEC→ATTEST→SETTLE→DELIVER</div>
          <div className="mt-2 flex gap-3">
            <span><span style={{ color: "#FF1DCE" }}>●</span> AI</span>
            <span><span style={{ color: "#BFFF00" }}>●</span> I/O</span>
            <span><span style={{ color: "#19D184" }}>●</span> crypto/verified</span>
          </div>
          <div className="mt-1 text-gray-600">each particle = a live inference flowing through the TEE</div>
        </div>
      </section>
    </main>
  );
}
