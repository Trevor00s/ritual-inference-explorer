"use client";

import { useEffect, useRef } from "react";
import { C } from "@/lib/neural";
import { ACCENT_HEX } from "@/lib/ritual/constants";
import type { InferenceRecord } from "@/lib/ritual/types";
import { huntField, type HuntTarget } from "@/lib/hunt";

// Free-floating transaction-particle field (à la the reference repo's particle pool):
// each live inference is a drifting, colour-coded dot. Failed (red) and pending
// (amber) dots are prey for the lizard; the rest are coloured by precompile group.
// No pipeline rail / stage labels.

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  ttl: number; // frames remaining (<=0 for ambient = immortal)
  ambient: boolean;
  huntable: boolean;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}

export function NeuralCanvas({ records }: { records: InferenceRecord[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const spawnQ = useRef<{ color: string; huntable: boolean }[]>([]);

  // ingest new records → queue tx particles (red=error, amber=pending → prey; else group colour)
  useEffect(() => {
    let added = 0;
    for (const r of records) {
      const key = `${r.systemTx ?? r.originalTx}-${r.blockNumber}`;
      if (!seen.current.has(key)) {
        seen.current.add(key);
        if (added < 16) {
          const huntable = !!(r.decoded.hasError || r.decoded.outputViaCallback);
          const color = r.decoded.hasError
            ? C.red
            : r.decoded.outputViaCallback
              ? C.gold
              : ACCENT_HEX[r.accent] ?? C.cyan;
          spawnQ.current.push({ color, huntable });
          added++;
        }
      }
    }
    if (seen.current.size > 600) seen.current = new Set([...seen.current].slice(-300));
  }, [records]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const context = el.getContext("2d");
    if (!context) return;
    const cv: HTMLCanvasElement = el;
    const cx: CanvasRenderingContext2D = context;

    let raf = 0;
    let w = 0;
    let h = 0;
    let nextId = 1;
    const sparks: Spark[] = [];

    function resize() {
      const parent = cv.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = parent.clientWidth;
      h = parent.clientHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      cv.style.width = w + "px";
      cv.style.height = h + "px";
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    if (cv.parentElement) ro.observe(cv.parentElement);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    // ambient drifting dots
    for (let i = 0; i < 30; i++) {
      particles.current.push({
        id: nextId++, x: rand(0, w || 800), y: rand(0, h || 600),
        vx: rand(-0.4, 0.4), vy: rand(-0.4, 0.4),
        color: C.cyan, size: 1.5, ttl: -1, ambient: true, huntable: false,
      });
    }

    function draw() {
      cx.clearRect(0, 0, w, h);

      // spawn queued tx particles at random positions with a gentle drift
      while (spawnQ.current.length && particles.current.length < 150) {
        const item = spawnQ.current.shift()!;
        const edge = Math.random();
        particles.current.push({
          id: nextId++,
          x: rand(0.05 * w, 0.95 * w),
          y: rand(0.05 * h, 0.95 * h),
          vx: rand(-0.9, 0.9) || 0.4,
          vy: rand(-0.9, 0.9) || 0.4,
          color: item.color,
          size: 2.6 + Math.random() * 2.2,
          ttl: 360 + Math.floor(Math.random() * 240),
          ambient: false,
          huntable: item.huntable,
        });
        void edge;
      }

      const removals = huntField.drainRemovals();
      const rmSet = removals.length ? new Set(removals) : null;

      const next: Particle[] = [];
      const frameTargets: HuntTarget[] = [];
      for (const p of particles.current) {
        // motion + wrap
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x += w;
        else if (p.x > w) p.x -= w;
        if (p.y < 0) p.y += h;
        else if (p.y > h) p.y -= h;
        if (!p.ambient) p.ttl -= 1;

        // eaten by the lizard → spark burst, remove
        if (rmSet && rmSet.has(p.id)) {
          for (let k = 0; k < 16; k++) {
            const ang = (k / 16) * Math.PI * 2;
            const sp = 1 + Math.random() * 3.5;
            sparks.push({ x: p.x, y: p.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1, color: p.color });
          }
          continue;
        }
        if (!p.ambient && p.ttl <= 0) continue; // expired

        const fade = p.ambient ? 1 : Math.min(1, p.ttl / 60); // fade out near end
        cx.beginPath();
        cx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        cx.fillStyle = hexToRgba(p.color, p.ambient ? 0.5 : 0.9 * fade);
        cx.shadowColor = p.color;
        cx.shadowBlur = p.ambient ? 4 : 12;
        cx.fill();
        cx.shadowBlur = 0;

        if (!p.ambient) frameTargets.push({ id: p.id, x: p.x, y: p.y, huntable: p.huntable });
        next.push(p);
      }
      particles.current = next;
      huntField.publish(frameTargets);

      // sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.92;
        s.vy *= 0.92;
        s.life -= 0.045;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        cx.beginPath();
        cx.arc(s.x, s.y, 1.6 * s.life + 0.4, 0, Math.PI * 2);
        cx.fillStyle = hexToRgba(s.color, s.life);
        cx.fill();
      }

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />;
}
