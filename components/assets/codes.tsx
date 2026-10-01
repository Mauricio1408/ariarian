"use client";

import { motion } from "motion/react";

/** Deterministic hash → bits, so every asset gets a stable label. */
function bits(seed: string, n: number) {
  let h = 2166136261;
  const out: boolean[] = [];
  for (let i = 0; i < n; i++) {
    h ^= seed.charCodeAt(i % seed.length) + i * 31;
    h = Math.imul(h, 16777619) >>> 0;
    out.push(((h >>> (i % 13)) & 1) === 1);
  }
  return out;
}

/** QR-style matrix with three finder patterns (visual label, not a scannable code). */
export function QrCode({ value, size = 104 }: { value: string; size?: number }) {
  const N = 25;
  const b = bits(value, N * N);
  const cell = size / N;
  const finder = (x: number, y: number) => {
    const inBox = (cx: number, cy: number) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7;
    for (const [cx, cy] of [[0, 0], [N - 7, 0], [0, N - 7]]) {
      if (inBox(cx, cy)) {
        const dx = x - cx, dy = y - cy;
        const ring = dx === 0 || dy === 0 || dx === 6 || dy === 6;
        const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        return ring || core ? 1 : 0;
      }
      if (x >= cx - 1 && x <= cx + 7 && y >= cy - 1 && y <= cy + 7) return 0;
    }
    return -1;
  };
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const f = finder(x, y);
    if (f === 1 || (f === -1 && b[y * N + x])) rects.push(<rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell + 0.2} height={cell + 0.2} />);
  }
  return (
    <motion.svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="fill-ink" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.15 }}>
      {rects}
    </motion.svg>
  );
}

export function Barcode({ value, width = 128, height = 32 }: { value: string; width?: number; height?: number }) {
  const b = bits(value, 64);
  let x = 0;
  const bars: React.ReactNode[] = [];
  b.forEach((on, i) => {
    const w = on ? 2.4 : 1.2;
    if (i % 2 === 0) bars.push(<motion.rect key={i} x={x} y={0} width={w} height={height} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} style={{ transformOrigin: "bottom" }} transition={{ duration: 0.3, delay: 0.2 + i * 0.004 }} />);
    x += w + 0.9;
  });
  return <svg width={width} height={height} viewBox={`0 0 ${x} ${height}`} preserveAspectRatio="none" className="fill-ink">{bars}</svg>;
}
