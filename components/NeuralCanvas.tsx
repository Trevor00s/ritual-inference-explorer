"use client";

import { useEffect, useRef } from "react";
import { STAGES, C, dRand, controlPoint, pathPoint, type Pt } from "@/lib/neural";
import { ACCENT_HEX } from "@/lib/ritual/constants";
import type { InferenceRecord } from "@/lib/ritual/types";
import { huntField, type HuntTarget } from "@/lib/hunt";

interface Particle {
  id: number;
  t: number;
  speed: number;
  color: string;
  size: number;
  trail: Pt[];
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

  // ingest new records → queue particles (red=error, amber=pending → prey; else by precompile group)
  useEffect(() => {
    let added = 0;
    for (const r of records) {
      const key = `${r.systemTx ?? r.originalTx}-${r.blockNumber}`;
      if (!seen.current.has(key)) {
        seen.current.add(key);
        if (added < 14) {
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
    let nodesPx: Pt[] = [];
    let ctrls: Pt[] = [];
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
      nodesPx = STAGES.map((s) => ({ x: s.x * w, y: s.y * h }));
      ctrls = nodesPx.slice(0, -1).map((p, i) => controlPoint(p, nodesPx[i + 1], i));
    }
    resize();
    const ro = new ResizeObserver(resize);
    if (cv.parentElement) ro.observe(cv.parentElement);

    for (let i = 0; i < 10; i++) {
      particles.current.push({ id: nextId++, t: Math.random(), speed: 0.0012 + Math.random() * 0.001, color: C.cyan, size: 1.6, trail: [], ambient: true, huntable: false });
    }

    let frame = 0;
    function draw() {
      frame++;
      cx.clearRect(0, 0, w, h);

      while (spawnQ.current.length && particles.current.length < 130) {
        const item = spawnQ.current.shift()!;
        particles.current.push({ id: nextId++, t: 0, speed: 0.0026 + Math.random() * 0.0022, color: item.color, size: 2.6 + Math.random() * 2, trail: [], ambient: false, huntable: item.huntable });
      }

      const removals = huntField.drainRemovals();
      const rmSet = removals.length ? new Set(removals) : null;

      // node activity
      const nodeColor: (string | null)[] = STAGES.map(() => null);
      for (const p of particles.current) {
        if (p.ambient) continue;
        const scaled = p.t * (STAGES.length - 1);
        const nearest = Math.round(scaled);
        if (Math.abs(scaled - nearest) < 0.16) nodeColor[nearest] = p.color;
      }

      // axons
      for (let i = 0; i < nodesPx.length - 1; i++) {
        const a = nodesPx[i];
        const c = ctrls[i];
        const b = nodesPx[i + 1];
        const lit = nodeColor[i] || nodeColor[i + 1];
        const base = lit ?? C.cyan;
        for (const pass of [
          { width: 9, alpha: lit ? 0.1 : 0.05 },
          { width: 3, alpha: lit ? 0.35 : 0.16 },
          { width: 1, alpha: lit ? 0.9 : 0.4 },
        ]) {
          cx.beginPath();
          cx.moveTo(a.x, a.y);
          cx.quadraticCurveTo(c.x, c.y, b.x, b.y);
          cx.strokeStyle = hexToRgba(base, pass.alpha);
          cx.lineWidth = pass.width;
          cx.stroke();
        }
      }

      // nodes
      cx.font = "10px ui-monospace, monospace";
      cx.textAlign = "center";
      STAGES.forEach((s, i) => {
        const p = nodesPx[i];
        if (!p) return;
        const col = nodeColor[i] ?? C.cyan;
        const phase = (frame / 90 + dRand(i + 5)) % 1;
        cx.beginPath();
        cx.arc(p.x, p.y, phase * 34, 0, Math.PI * 2);
        cx.strokeStyle = hexToRgba(col, (1 - phase) * (nodeColor[i] ? 0.5 : 0.25));
        cx.lineWidth = 1;
        cx.stroke();
        cx.beginPath();
        cx.arc(p.x, p.y, nodeColor[i] ? 9 : 5, 0, Math.PI * 2);
        cx.fillStyle = hexToRgba(col, 0.18);
        cx.fill();
        cx.beginPath();
        cx.arc(p.x, p.y, nodeColor[i] ? 4 : 2.6, 0, Math.PI * 2);
        cx.fillStyle = col;
        cx.fill();
        cx.fillStyle = hexToRgba(col, nodeColor[i] ? 0.95 : 0.5);
        cx.fillText(s.label, p.x, p.y - 16);
      });

      // particles
      const next: Particle[] = [];
      const frameTargets: HuntTarget[] = [];
      for (const p of particles.current) {
        p.t += p.speed;
        if (p.ambient && p.t >= 1) p.t = 0;
        if (!p.ambient && p.t >= 1) continue;
        const pos = pathPoint(nodesPx, ctrls, p.t);

        // eaten by the hunter → burst into sparks, remove
        if (rmSet && rmSet.has(p.id)) {
          for (let k = 0; k < 14; k++) {
            const ang = (k / 14) * Math.PI * 2;
            const sp = 1 + Math.random() * 3.5;
            sparks.push({ x: pos.x, y: pos.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1, color: p.color });
          }
          continue;
        }

        p.trail.push({ x: pos.x, y: pos.y });
        if (p.trail.length > (p.ambient ? 6 : 14)) p.trail.shift();
        for (let k = 0; k < p.trail.length; k++) {
          const tp = p.trail[k];
          cx.beginPath();
          cx.arc(tp.x, tp.y, p.size * (k / p.trail.length) * 0.9 + 0.4, 0, Math.PI * 2);
          cx.fillStyle = hexToRgba(p.color, (k / p.trail.length) * (p.ambient ? 0.25 : 0.6));
          cx.fill();
        }
        cx.beginPath();
        cx.arc(pos.x, pos.y, p.size, 0, Math.PI * 2);
        cx.fillStyle = p.color;
        cx.shadowColor = p.color;
        cx.shadowBlur = p.ambient ? 4 : 12;
        cx.fill();
        cx.shadowBlur = 0;

        if (!p.ambient) frameTargets.push({ id: p.id, x: pos.x, y: pos.y, huntable: p.huntable });
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
