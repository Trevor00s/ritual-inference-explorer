import { ACCENT_HEX, type Accent } from "./ritual/constants";

export function shortHash(h?: string | null, n = 6): string {
  if (!h) return "—";
  if (h.length <= 2 * n + 2) return h;
  return `${h.slice(0, n + 2)}…${h.slice(-4)}`;
}

export function shortAddr(a?: string | null): string {
  if (!a) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function timeAgo(unixSeconds?: number | null): string {
  if (!unixSeconds) return "";
  // chain timestamps on Ritual are in ms in some fields; normalize
  const ms = unixSeconds > 1e12 ? unixSeconds : unixSeconds * 1000;
  const diff = Date.now() - ms;
  if (diff < 0) return "just now";
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function accentHex(accent: Accent): string {
  return ACCENT_HEX[accent];
}

/** Pretty-print a value that may be JSON. */
export function maybePrettyJson(value: string): string {
  const t = value.trim();
  if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
    try {
      return JSON.stringify(JSON.parse(t), null, 2);
    } catch {
      /* not json */
    }
  }
  return value;
}

export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_RITUAL_EXPLORER_URL || "https://explorer.ritualfoundation.org";

export function explorerTx(hash: string): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}
export function explorerAddr(addr: string): string {
  return `${EXPLORER_URL}/address/${addr}`;
}
