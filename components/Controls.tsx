"use client";

import { PRECOMPILES, type Accent } from "@/lib/ritual/constants";
import { accentHex } from "@/lib/format";

const FILTERS = PRECOMPILES.filter((p) => p.kind !== "sync").map((p) => ({
  key: p.key,
  label: p.badge,
  glyph: p.glyph,
  accent: p.accent,
}));

export function Controls({
  search,
  onSearch,
  active,
  onFilter,
  counts,
}: {
  search: string;
  onSearch: (v: string) => void;
  active: string | null;
  onFilter: (key: string | null) => void;
  counts: Record<string, number>;
}) {
  return (
    <div className="space-y-3">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search prompts, answers, models, addresses, tx…"
        className="w-full rounded-lg border border-gray-700 bg-ritual-surface px-4 py-2.5 text-sm text-gray-200 outline-none transition-colors placeholder:text-gray-600 focus:border-ritual-green"
      />
      <div className="flex flex-wrap gap-2">
        <Chip label="All" active={active === null} onClick={() => onFilter(null)} />
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={f.label}
            glyph={f.glyph}
            accent={f.accent}
            count={counts[f.key]}
            active={active === f.key}
            onClick={() => onFilter(active === f.key ? null : f.key)}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({
  label,
  glyph,
  accent,
  count,
  active,
  onClick,
}: {
  label: string;
  glyph?: string;
  accent?: Accent;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  const hex = accent ? accentHex(accent) : "#9CA3AF";
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-all"
      style={{
        color: active ? "#000" : hex,
        backgroundColor: active ? hex : `${hex}10`,
        borderColor: active ? hex : `${hex}40`,
      }}
    >
      {glyph && <span aria-hidden>{glyph}</span>}
      {label}
      {count != null && count > 0 && (
        <span className="tabular opacity-70">{count}</span>
      )}
    </button>
  );
}
