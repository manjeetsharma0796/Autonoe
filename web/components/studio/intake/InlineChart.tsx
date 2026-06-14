"use client";

/**
 * Dynamic inline SVG sparkline shown on the asset turn of the intake chat.
 * Tries the real candles API (getCandles → Bybit 1h) and falls back to a
 * deterministic seeded mock if it is unavailable - either way the framing
 * stays "· 48h · Bybit 1h" as in the prototype.
 */

import { useEffect, useState } from "react";
import { getCandles } from "@/lib/api";
import styles from "./IntakeChat.module.css";

const W = 600;
const H = 128;
const PAD_L = 12;
const PAD_R = 12;
const PAD_T = 14;
const PAD_B = 20;

/** Sum of char codes mod 7 - same seed scheme as the prototype. */
function assetSeed(a: string): number {
  let s = 0;
  for (const c of a) s += c.charCodeAt(0);
  return s % 7;
}

/** Deterministic 64-point series seeded from the ticker (mock fallback). */
function mockSeries(label: string): number[] {
  const seed = assetSeed(label);
  const pts: number[] = [];
  let v = 50;
  for (let i = 0; i < 64; i++) {
    v += Math.sin(i / 5 + seed) * 3.2 + Math.sin(i / 13 + seed * 1.7) * 2 + (seed - 3) * 0.35;
    pts.push(v);
  }
  return pts;
}

let gradN = 0;

export function InlineChart({ assetLabel }: { assetLabel: string }) {
  const [pts, setPts] = useState<number[] | null>(null);
  const [gradId] = useState(() => `icg-${gradN++}`);

  useEffect(() => {
    let alive = true;
    // Map a few common synthetics onto Bybit USDT perps; fall back to {SYM}USDT.
    const bybitSymbol = `${assetLabel.toUpperCase()}USDT`;
    getCandles(bybitSymbol, "60", 64)
      .then((candles) => {
        if (!alive) return;
        if (candles && candles.length >= 8) {
          setPts(candles.map((c) => c.close));
        } else {
          setPts(mockSeries(assetLabel));
        }
      })
      .catch(() => {
        if (alive) setPts(mockSeries(assetLabel));
      });
    return () => {
      alive = false;
    };
  }, [assetLabel]);

  if (!pts) {
    return (
      <div className={styles.inlinechart}>
        <div className={styles.icLoad}>pulling {assetLabel} from Bybit…</div>
      </div>
    );
  }

  const N = pts.length;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const rng = max - min || 1;
  const up = pts[N - 1] >= pts[0];
  const col = up ? "var(--green)" : "var(--red)";
  const sx = (i: number) => PAD_L + (i / (N - 1)) * (W - PAD_L - PAD_R);
  const sy = (x: number) => PAD_T + (1 - (x - min) / rng) * (H - PAD_T - PAD_B);
  const line = pts.map((x, i) => (i ? "L" : "M") + sx(i).toFixed(1) + " " + sy(x).toFixed(1)).join(" ");
  const area = `${line} L ${sx(N - 1).toFixed(1)} ${H - PAD_B} L ${sx(0).toFixed(1)} ${H - PAD_B} Z`;
  const delta = ((pts[N - 1] - pts[0]) / pts[0]) * 100;
  const ex = sx(N - 1).toFixed(1);
  const ey = sy(pts[N - 1]).toFixed(1);
  const gridLines = [1, 2].map((g) => (PAD_T + (g / 3) * (H - PAD_T - PAD_B)).toFixed(1));

  return (
    <div className={styles.inlinechart}>
      <div className={styles.icHead}>
        <span className={styles.icTitle}>
          {assetLabel} <span className={styles.icTf}>· 48h · Bybit 1h</span>
        </span>
        <span className={`${styles.icDelta} ${up ? styles.up : styles.down}`}>
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(1)}%
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${assetLabel} 48 hour price, ${delta.toFixed(1)} percent`}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={col} stopOpacity="0.3" />
            <stop offset="1" stopColor={col} stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridLines.map((y, i) => (
          <line key={i} x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="rgba(255,255,255,0.06)" />
        ))}
        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke={col} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={ex} cy={ey} r="7" fill={col} opacity="0.18" />
        <circle cx={ex} cy={ey} r="3.4" fill={col} />
        <text className={styles.icAxis} x={PAD_L} y={H - 6}>
          48h ago
        </text>
        <text className={styles.icAxis} x={W - PAD_R} y={H - 6} textAnchor="end">
          now
        </text>
      </svg>
    </div>
  );
}
