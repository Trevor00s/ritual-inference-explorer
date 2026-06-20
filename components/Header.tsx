"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function Header({ live }: { live?: { block?: number; window?: string } }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (/^0x[0-9a-fA-F]{64}$/.test(v)) router.push(`/tx/${v}`);
  }

  return (
    <header className="border-b border-gray-800/80">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="group">
          <div className="flex items-center gap-2">
            <span className="text-ritual-pink" aria-hidden>
              ◇
            </span>
            <h1 className="font-display text-lg font-extrabold uppercase tracking-[0.18em] text-gray-100">
              Ritual <span className="text-gray-500">/</span> Inference Explorer
            </h1>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            Etherscan for verifiable AI — every inference call on Ritual Chain, decoded with TEE proof.
          </p>
        </Link>
        <form onSubmit={go} className="sm:w-72">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Look up a tx hash (0x…)"
            className="w-full rounded-lg border border-gray-700 bg-ritual-surface px-3 py-2 font-mono text-xs text-gray-200 outline-none focus:border-ritual-green"
          />
        </form>
      </div>
    </header>
  );
}
