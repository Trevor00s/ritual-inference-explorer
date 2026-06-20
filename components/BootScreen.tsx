"use client";

import { useEffect, useState } from "react";

const LINES = [
  "initializing inference monitor",
  "connecting to ritual chain · id 1979",
  "scanning AsyncJobTracker events",
  "decoding spcCalls · input → output",
  "verifying TEE attestations",
];

/** Full-screen boot sequence shown until the first feed data is ready, then fades out. */
export function BootScreen({ done }: { done: boolean }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setHidden(true), 750); // let the fade finish
    return () => clearTimeout(t);
  }, [done]);

  if (hidden) return null;

  return (
    <div
      className={`scanlines fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-700 ${
        done ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div
        className="mb-6 h-24 w-24 animate-pulse-dot bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/ritual-mark.png)", filter: "drop-shadow(0 0 18px rgba(25,209,132,0.55))" }}
      />
      <div className="font-display text-sm font-extrabold uppercase tracking-[0.3em] text-gray-100">
        Ritual<span className="text-gray-600">//</span>
        <span className="neon-cyan">Inference Terminal</span>
      </div>

      <div className="mt-7 w-[19rem] max-w-[80vw] space-y-1.5 font-mono text-[11px] text-gray-500">
        {LINES.map((l, i) => (
          <div
            key={i}
            className="row-in flex items-center gap-2"
            style={{ animationDelay: `${i * 280}ms`, animationFillMode: "both" }}
          >
            <span className="text-ritual-green">›</span>
            <span>{l}</span>
            <span className="ml-auto" style={{ color: done ? "#19D184" : "#6B7280" }}>
              {done ? "ok" : "··"}
            </span>
          </div>
        ))}
        <div
          className="row-in term-cursor pt-2 text-ritual-green"
          style={{ animationDelay: `${LINES.length * 280}ms`, animationFillMode: "both" }}
        >
          {done ? "online — entering" : "scanning chain"}
        </div>
      </div>
    </div>
  );
}
