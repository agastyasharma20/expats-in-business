"use client";

import { useEffect, useRef } from "react";

type Node = { x: number; y: number; vx: number; vy: number; r: number };

const LINK_DISTANCE = 130;
const POINTER_RADIUS = 170;
const FRAME_MS = 1000 / 30;

/**
 * A quiet "network" drifting behind the hero: small nodes that link up when they pass close, and lean
 * toward the pointer. It is decorative (aria-hidden), colours come from the design tokens, it draws at
 * most 30 frames a second, pauses when the tab is hidden or the hero is off screen, and draws a single
 * still frame when the visitor prefers reduced motion.
 */
export function NetworkField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement?.parentElement; // the hero section
    const context = canvas?.getContext("2d");
    if (!canvas || !host || !context) return;

    const css = getComputedStyle(document.documentElement);
    const lineColor = css.getPropertyValue("--brand-700").trim() || "teal";
    const nodeColor = css.getPropertyValue("--brand-500").trim() || "teal";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let nodes: Node[] = [];
    let pointer: { x: number; y: number } | null = null;
    let raf = 0;
    let last = 0;
    let visible = true;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = host!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      context!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(16, Math.min(54, Math.round(width / 22)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.32,
        vy: (Math.random() - 0.5) * 0.32,
        r: 1.4 + Math.random() * 1.6,
      }));
    }

    function draw() {
      const ctx = context!;
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i]!;
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j]!;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK_DISTANCE) {
            ctx.globalAlpha = (1 - d / LINK_DISTANCE) * 0.22;
            ctx.strokeStyle = lineColor;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        if (pointer) {
          const d = Math.hypot(a.x - pointer.x, a.y - pointer.y);
          if (d < POINTER_RADIUS) {
            ctx.globalAlpha = (1 - d / POINTER_RADIUS) * 0.4;
            ctx.strokeStyle = lineColor;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
          }
        }
      }
      ctx.fillStyle = nodeColor;
      for (const n of nodes) {
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function step(now: number) {
      raf = requestAnimationFrame(step);
      if (!visible || document.hidden || now - last < FRAME_MS) return;
      last = now;
      for (const n of nodes) {
        if (pointer) {
          const dx = pointer.x - n.x;
          const dy = pointer.y - n.y;
          const d = Math.hypot(dx, dy);
          if (d < POINTER_RADIUS && d > 1) {
            n.vx += (dx / d) * 0.006;
            n.vy += (dy / d) * 0.006;
          }
        }
        n.vx = Math.max(-0.45, Math.min(0.45, n.vx * 0.999));
        n.vy = Math.max(-0.45, Math.min(0.45, n.vy * 0.999));
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      }
      draw();
    }

    const onMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      pointer = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height ? { x, y } : null;
    };
    const onLeave = () => {
      pointer = null;
    };

    resize();
    draw();
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    observer.observe(host);
    const resizer = new ResizeObserver(() => {
      resize();
      draw();
    });
    resizer.observe(host);

    if (!reduced) {
      raf = requestAnimationFrame(step);
      window.addEventListener("pointermove", onMove, { passive: true });
      host.addEventListener("pointerleave", onLeave);
    }
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      resizer.disconnect();
      window.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 size-full opacity-90" />
  );
}
