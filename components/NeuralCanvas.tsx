"use client";

import { useEffect, useRef } from "react";
import { STAGES, C, dRand, controlPoint, pathPoint, type Pt } from "@/lib/neural";
import { ACCENT_HEX } from "@/lib/ritual/constants";
import type { InferenceRecord } from "@/lib/ritual/types";

interface Particle {
  t: number;
  speed: number;
  color: string;
  size: number;
  trail: Pt[];
  ambient: boolean;
}

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function NeuralCanvas({ records }: { records: InferenceRecord[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const spawnQ = useRef<string[]>([]);

  useEffect(() => {
    let added = 0;
    for (const r of records) {
      const key = `${r.systemTx ?? r.originalTx}-${r.blockNumber}`;
      if (!seen.current.has(key)) {
        seen.current.add(key);
        if (added < 14) {
          spawnQ.current.push(ACCENT_HEX[r.accent] ?? C.cyan);
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
      particles.current.push({ t: Math.random(), speed: 0.0012 + Math.random() * 0.001, color: C.cyan, size: 1.6, trail: [], ambient: true });
    }

    let frame = 0;
    function draw() {
      frame++;
      cx.clearRect(0, 0, w, h);

      while (spawnQ.current.length && particles.current.length < 130) {
        const color = spawnQ.current.shift()!;
        particles.current.push({ t: 0, speed: 0.0026 + Math.random() * 0.0022, color, size: 2.6 + Math.random() * 2, trail: [], ambient: false });
      }

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
        const passes = [
          { width: 9, alpha: lit ? 0.1 : 0.05 },
          { width: 3, alpha: lit ? 0.35 : 0.16 },
          { width: 1, alpha: lit ? 0.9 : 0.4 },
        ];
        for (const pass of passes) {
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
      for (const p of particles.current) {
        p.t += p.speed;
        if (p.ambient && p.t >= 1) p.t = 0;
        if (!p.ambient && p.t >= 1) continue;
        const pos = pathPoint(nodesPx, ctrls, p.t);
        p.trail.push({ x: pos.x, y: pos.y });
        if (p.trail.length > (p.ambient ? 6 : 14)) p.trail.shift();

        for (let k = 0; k < p.trail.length; k++) {
          const tp = p.trail[k];
          const a = (k / p.trail.length) * (p.ambient ? 0.25 : 0.6);
          cx.beginPath();
          cx.arc(tp.x, tp.y, p.size * (k / p.trail.length) * 0.9 + 0.4, 0, Math.PI * 2);
          cx.fillStyle = hexToRgba(p.color, a);
          cx.fill();
        }
        cx.beginPath();
        cx.arc(pos.x, pos.y, p.size, 0, Math.PI * 2);
        cx.fillStyle = p.color;
        cx.shadowColor = p.color;
        cx.shadowBlur = p.ambient ? 4 : 12;
        cx.fill();
        cx.shadowBlur = 0;
        next.push(p);
      }
      particles.current = next;

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
