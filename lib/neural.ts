// Deterministic geometry + pipeline model for the Neural Terminal canvas.
// No Math.random() in layout — sin-based PRNG so the graph is identical every session.

export interface StageNode {
  key: string;
  label: string;
  x: number; // 0..1 of canvas width
  y: number; // 0..1 of canvas height
}

// Ritual's async / TEE execution pipeline (maps the 9-state job lifecycle to 6 visual nodes).
export const STAGES: StageNode[] = [
  { key: "submit", label: "SUBMIT", x: 0.07, y: 0.5 },
  { key: "commit", label: "COMMIT", x: 0.27, y: 0.28 },
  { key: "tee", label: "TEE·EXEC", x: 0.47, y: 0.72 },
  { key: "attest", label: "ATTEST", x: 0.67, y: 0.34 },
  { key: "settle", label: "SETTLE", x: 0.85, y: 0.62 },
  { key: "deliver", label: "DELIVER", x: 0.96, y: 0.46 },
];

// neon palette (Ritual brand blended with neural-terminal network colors)
export const NET_CYAN = "#00e5ff"; // idle network lines / nodes
export const C = {
  cyan: "#00e5ff",
  green: "#19D184", // verified / finalized (Ritual)
  pink: "#FF1DCE", // AI (Ritual)
  lime: "#BFFF00", // data/IO (Ritual)
  gold: "#FACC15", // pending / mid
  red: "#EF4444", // error
};

export function dRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface Pt {
  x: number;
  y: number;
}

export function quad(p0: Pt, c: Pt, p1: Pt, t: number): Pt {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * c.x + t * t * p1.x,
    y: mt * mt * p0.y + 2 * mt * t * c.y + t * t * p1.y,
  };
}

/** Control point for the axon between two nodes — perpendicular offset, deterministic. */
export function controlPoint(a: Pt, b: Pt, segIndex: number): Pt {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  // perpendicular unit
  const px = -dy / len;
  const py = dx / len;
  const amp = (dRand(segIndex + 1) - 0.5) * len * 0.45;
  return { x: mx + px * amp, y: my + py * amp };
}

/** Position along the whole piecewise path at global t in [0,1]. Returns point + segment index. */
export function pathPoint(nodes: Pt[], ctrls: Pt[], t: number): Pt & { seg: number } {
  const segs = nodes.length - 1;
  const ft = Math.min(0.99999, Math.max(0, t)) * segs;
  const i = Math.min(segs - 1, Math.floor(ft));
  const f = ft - i;
  const p = quad(nodes[i], ctrls[i], nodes[i + 1], f);
  return { ...p, seg: i };
}
