"use client";

/**
 * Cumulative PnL-over-time SVG area chart.
 * Sorts HistoryRecord[] by createdAt, accumulates pnlMUSD (null → 0),
 * and renders a line/area chart with gain=green / loss=red colouring.
 * No external dependencies - custom SVG only, matching the markets sparkline pattern.
 */

import type { HistoryRecord } from "@autonoe/shared";

const W = 800;
const H = 200;
const PAD = { top: 16, right: 16, bottom: 36, left: 56 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

const GREEN = "#3FE0A6";
const RED = "#FF6B6B";

interface CumulativePoint {
  x: number; // chart coordinate
  y: number; // chart coordinate
  value: number; // raw mUSD value
  date: string; // formatted label
}

function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function buildPoints(records: HistoryRecord[]): CumulativePoint[] {
  const sorted = [...records].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const cumulative: { value: number; date: string }[] = [];
  let running = 0;
  for (const rec of sorted) {
    running += rec.pnlMUSD ?? 0;
    cumulative.push({ value: running, date: rec.createdAt });
  }

  if (cumulative.length === 0) return [];

  const values = cumulative.map((p) => p.value);
  const minV = Math.min(0, ...values);
  const maxV = Math.max(0, ...values);
  const rangeV = maxV - minV || 1;

  return cumulative.map((p, i) => ({
    x: PAD.left + (i / Math.max(cumulative.length - 1, 1)) * INNER_W,
    y: PAD.top + (1 - (p.value - minV) / rangeV) * INNER_H,
    value: p.value,
    date: p.date,
  }));
}

function pointsToPolyline(pts: CumulativePoint[]): string {
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

function buildFillPath(pts: CumulativePoint[], baselineY: number): string {
  if (pts.length === 0) return "";
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ");
  const last = pts[pts.length - 1];
  const first = pts[0];
  return `M ${first.x.toFixed(1)},${baselineY.toFixed(1)} L ${line} L ${last.x.toFixed(1)},${baselineY.toFixed(1)} Z`;
}

function yAxisLabels(records: HistoryRecord[]): { y: number; label: string }[] {
  const sorted = [...records].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const values: number[] = [];
  let running = 0;
  for (const rec of sorted) {
    running += rec.pnlMUSD ?? 0;
    values.push(running);
  }
  const minV = Math.min(0, ...values);
  const maxV = Math.max(0, ...values);
  const rangeV = maxV - minV || 1;

  const ticks = [minV, (minV + maxV) / 2, maxV];
  return ticks.map((v) => ({
    y: PAD.top + (1 - (v - minV) / rangeV) * INNER_H,
    label: (v >= 0 ? "+" : "") + v.toFixed(1),
  }));
}

export function PnlChart({ records }: { records: HistoryRecord[] }) {
  if (records.length === 0) {
    return (
      <div
        style={{
          border: "1px solid rgba(255,255,255,.08)",
          borderRadius: 16,
          background: "var(--panel)",
          padding: "40px 24px",
          textAlign: "center",
          color: "var(--faint)",
          fontFamily: "var(--mono)",
          fontSize: 13,
          letterSpacing: ".06em",
        }}
      >
        No PnL data yet - execute an AI thesis to populate the benchmark.
      </div>
    );
  }

  const pts = buildPoints(records);
  const lastValue = pts.length > 0 ? pts[pts.length - 1].value : 0;
  const color = lastValue >= 0 ? GREEN : RED;

  // Zero-line Y coordinate
  const sortedVals: number[] = [];
  let running = 0;
  for (const rec of [...records].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )) {
    running += rec.pnlMUSD ?? 0;
    sortedVals.push(running);
  }
  const minV = Math.min(0, ...sortedVals);
  const maxV = Math.max(0, ...sortedVals);
  const rangeV = maxV - minV || 1;
  const zeroY = PAD.top + (1 - (0 - minV) / rangeV) * INNER_H;

  const polyline = pointsToPolyline(pts);
  const fillPath = buildFillPath(pts, zeroY);
  const axisLabels = yAxisLabels(records);

  // X-axis date labels - up to 5 evenly spaced
  const xLabels: { x: number; label: string }[] = [];
  if (pts.length === 1) {
    xLabels.push({ x: pts[0].x, label: formatShortDate(pts[0].date) });
  } else if (pts.length > 1) {
    const step = Math.max(1, Math.floor((pts.length - 1) / 4));
    for (let i = 0; i < pts.length; i += step) {
      xLabels.push({ x: pts[i].x, label: formatShortDate(pts[i].date) });
    }
    const last = pts[pts.length - 1];
    if (xLabels[xLabels.length - 1].x !== last.x) {
      xLabels.push({ x: last.x, label: formatShortDate(last.date) });
    }
  }

  const gradientId = "pnl-area-grad";

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 16,
        background: "var(--panel)",
        padding: "20px 0 0",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px 14px",
          borderBottom: "1px solid rgba(255,255,255,.06)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: ".18em",
            textTransform: "uppercase",
            color: "var(--faint)",
          }}
        >
          Cumulative PnL
        </span>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontWeight: 700,
            fontSize: 15,
            color,
          }}
        >
          {lastValue >= 0 ? "+" : ""}
          {lastValue.toFixed(2)} mUSD
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: 200, display: "block" }}
        aria-label="Cumulative PnL over time"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.28" />
            <stop offset="1" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Zero baseline */}
        <line
          x1={PAD.left}
          y1={zeroY}
          x2={W - PAD.right}
          y2={zeroY}
          stroke="rgba(255,255,255,.1)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Y-axis grid lines */}
        {axisLabels.map((tick, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={tick.y}
              x2={W - PAD.right}
              y2={tick.y}
              stroke="rgba(255,255,255,.04)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 6}
              y={tick.y + 4}
              textAnchor="end"
              fill="var(--faint)"
              fontSize="10"
              fontFamily="var(--mono)"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={fillPath} fill={`url(#${gradientId})`} />

        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data point dots */}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} opacity="0.7" />
        ))}

        {/* X-axis labels */}
        {xLabels.map((lbl, i) => (
          <text
            key={i}
            x={lbl.x}
            y={H - 6}
            textAnchor="middle"
            fill="var(--faint)"
            fontSize="10"
            fontFamily="var(--mono)"
          >
            {lbl.label}
          </text>
        ))}

        {/* Y-axis left border */}
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={H - PAD.bottom}
          stroke="rgba(255,255,255,.06)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
