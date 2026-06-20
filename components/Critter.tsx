"use client";

import { useEffect, useRef } from "react";
import { startCritter } from "@/lib/critter";
import { huntField } from "@/lib/hunt";

/** Neon IK lizard that hunts failed/pending inference particles (else follows the
 *  cursor), with the Ritual logo on its head. Click-through overlay. */
export function Critter({ color = "#19D184" }: { color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const mouse = { x: canvas.clientWidth / 2 || 500, y: canvas.clientHeight / 2 || 300 };

    function onMove(e: MouseEvent) {
      const r = canvas!.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    }
    window.addEventListener("mousemove", onMove);

    const logo = new Image();
    logo.src = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/ritual-mark.png`;

    const stop = startCritter(canvas, mouse, { color, hunt: huntField, logo });

    return () => {
      window.removeEventListener("mousemove", onMove);
      stop && stop();
    };
  }, [color]);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden />;
}
