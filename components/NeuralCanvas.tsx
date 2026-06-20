"use client";

import { useEffect, useRef } from "react";
import { C } from "@/lib/neural";
import { ACCENT_HEX } from "@/lib/ritual/constants";
import type { InferenceRecord } from "@/lib/ritual/types";
import { huntField, type HuntTarget } from "@/lib/hunt";

// Live transaction field: every particle is a REAL inference call, rendered as its
// precompile glyph and coloured by status. No empty filler dots. The lizard chases
// and eats them (game-style), inspired by the reference repo's tx-hunting particles.

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  label: string;
  size: number;
  ttl: number;
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
  const spawnQ = useRef<{ color: string; label: string }[]>([]);

  // ingest new records → queue a token per real inference, shown as its tx hash
  useEffect(() => {
    let added = 0;
    for (const r of records) {
      const key = `${r.systemTx ?? r.originalTx}-${r.blockNumber}`;
      if (!seen.current.has(key)) {
        seen.current.add(key);
        if (added < 40) {
          const color = r.decoded.hasError
            ? C.red
            : r.decoded.outputViaCallback
              ? C.gold
              : ACCENT_HEX[r.accent] ?? C.cyan;
          const tx = r.originalTx ?? r.systemTx ?? "";
          const label = tx ? `${tx.slice(0, 6)}…${tx.slice(-4)}` : r.badge || "tx";
          spawnQ.current.push({ color, label });
          added++;
        }
      }
    }
    if (seen.current.size > 800) seen.current = new Set([...seen.current].slice(-400));
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
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    function resize() {
      const parent = cv.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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

    let lastT = 0;
    function draw(t: number) {
      raf = requestAnimationFrame(draw);
      if (t - lastT < 33) return; // ~30fps is plenty for the particle field
      lastT = t;
      cx.clearRect(0, 0, w, h);

      while (spawnQ.current.length && particles.current.length < 60) {
        const item = spawnQ.current.shift()!;
        particles.current.push({
          id: nextId++,
          x: rand(0.05 * w, 0.95 * w),
          y: rand(0.05 * h, 0.95 * h),
          vx: rand(-0.8, 0.8) || 0.4,
          vy: rand(-0.8, 0.8) || 0.4,
          color: item.color,
          label: item.label,
          size: 3 + Math.random() * 2,
          ttl: 800 + Math.floor(Math.random() * 600),
        });
      }

      const removals = huntField.drainRemovals();
      const rmSet = removals.length ? new Set(removals) : null;

      cx.textAlign = "center";
      cx.textBaseline = "middle";

      const next: Particle[] = [];
      const frameTargets: HuntTarget[] = [];
      for (const p of particles.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x += w;
        else if (p.x > w) p.x -= w;
        if (p.y < 0) p.y += h;
        else if (p.y > h) p.y -= h;
        p.ttl -= 1;

        if (rmSet && rmSet.has(p.id)) {
          for (let k = 0; k < 16; k++) {
            const ang = (k / 16) * Math.PI * 2;
            const sp = 1 + Math.random() * 3.5;
            sparks.push({ x: p.x, y: p.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1, color: p.color });
          }
          continue;
        }
        if (p.ttl <= 0) continue;

        const fade = Math.min(1, p.ttl / 80);
        // glowing nucleus
        cx.beginPath();
        cx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        cx.fillStyle = hexToRgba(p.color, 0.85 * fade);
        cx.shadowColor = p.color;
        cx.shadowBlur = 6;
        cx.fill();
        cx.shadowBlur = 0;
        // transaction hash label — the particle IS a tx
        cx.font = "10px ui-monospace, monospace";
        cx.fillStyle = hexToRgba(p.color, fade);
        cx.fillText(p.label, p.x, p.y - p.size - 7);

        frameTargets.push({ id: p.id, x: p.x, y: p.y, huntable: true });
        next.push(p);
      }
      particles.current = next;
      huntField.publish(frameTargets);

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

    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />;
}
