// Shared coordination between the particle field (NeuralCanvas) and the hunter
// (Critter). Both canvases share the same CSS-pixel coordinate space, so target
// positions can be passed directly.

export interface HuntTarget {
  id: number;
  x: number;
  y: number;
  huntable: boolean;
}

let targets: HuntTarget[] = [];
const eaten = new Set<number>(); // permanent dedupe (skip + prevent double-count)
let removalQueue: number[] = []; // ids the particle field should remove + spark
let kills = 0;
const listeners = new Set<() => void>();

export const huntField = {
  /** particle field publishes its live targets each frame */
  publish(t: HuntTarget[]) {
    targets = t;
  },
  /** hunter finds nearest un-eaten huntable target to (x,y) */
  nearestHuntable(x: number, y: number): HuntTarget | null {
    let best: HuntTarget | null = null;
    let bd = Infinity;
    for (const t of targets) {
      if (!t.huntable || eaten.has(t.id)) continue;
      const d = (t.x - x) * (t.x - x) + (t.y - y) * (t.y - y);
      if (d < bd) {
        bd = d;
        best = t;
      }
    }
    return best;
  },
  /** nearest tx of any kind — to drift toward when no prey is huntable */
  nearestAny(x: number, y: number): HuntTarget | null {
    let best: HuntTarget | null = null;
    let bd = Infinity;
    for (const t of targets) {
      if (eaten.has(t.id)) continue;
      const d = (t.x - x) * (t.x - x) + (t.y - y) * (t.y - y);
      if (d < bd) {
        bd = d;
        best = t;
      }
    }
    return best;
  },
  /** hunter calls on contact */
  markEaten(id: number) {
    if (eaten.has(id)) return;
    eaten.add(id);
    removalQueue.push(id);
    kills++;
    if (eaten.size > 2000) eaten.clear();
    listeners.forEach((l) => l());
  },
  /** particle field drains ids to remove + spark this frame */
  drainRemovals(): number[] {
    if (removalQueue.length === 0) return [];
    const a = removalQueue;
    removalQueue = [];
    return a;
  },
  get kills() {
    return kills;
  },
  /** HUD subscribes to kill-count changes */
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
