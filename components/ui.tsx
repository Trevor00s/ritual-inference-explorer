"use client";

import { useState } from "react";
import { accentHex } from "@/lib/format";
import type { Accent } from "@/lib/ritual/constants";

export function Badge({ glyph, label, accent }: { glyph: string; label: string; accent: Accent }) {
  const hex = accentHex(accent);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
      style={{ color: hex, borderColor: `${hex}55`, backgroundColor: `${hex}12` }}
    >
      <span aria-hidden>{glyph}</span>
      {label}
    </span>
  );
}

export function AccentDot({ accent, pulse }: { accent: Accent; pulse?: boolean }) {
  const hex = accentHex(accent);
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${pulse ? "animate-pulse-dot" : ""}`}
      style={{ backgroundColor: hex, boxShadow: `0 0 8px ${hex}` }}
    />
  );
}

export function KindTag({ kind }: { kind: "sync" | "short" | "long" }) {
  const label = kind === "short" ? "short-async" : kind === "long" ? "long-async" : "sync";
  return (
    <span className="rounded border border-gray-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-gray-500">
      {label}
    </span>
  );
}

export function ProofChip({
  proof,
  encrypted,
  callback,
  hasError,
}: {
  proof?: string | null;
  encrypted?: boolean;
  callback?: boolean;
  hasError?: boolean;
}) {
  if (hasError)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "#EF4444" }}>
        ✕ failed
      </span>
    );
  if (encrypted)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "#FF1DCE" }}>
        🔒 encrypted output
      </span>
    );
  if (proof)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "#19D184" }}>
        ✓ TEE proof
      </span>
    );
  if (callback)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "#FACC15" }}>
        ◷ phase-2 callback
      </span>
    );
  return null;
}

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="text-gray-500 transition-colors hover:text-ritual-lime"
      title="Copy"
    >
      {copied ? "copied ✓" : (label ?? "copy")}
    </button>
  );
}
