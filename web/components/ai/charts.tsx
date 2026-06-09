"use client";

/**
 * Lightweight, dependency-free SVG charts for inline AI output.
 * Rendered from fenced ```chart / ```heatmap blocks the model emits.
 */
import React from "react";

type BarPoint = { label: string; value: number };
type ChartSpec = {
  type?: "bar" | "line";
  title?: string;
  unit?: string;
  data: BarPoint[] | number[];
};

function toPoints(data: BarPoint[] | number[]): BarPoint[] {
  if (!Array.isArray(data)) return [];
  if (typeof data[0] === "number") {
    return (data as number[]).map((v, i) => ({ label: String(i + 1), value: v }));
  }
  return (data as BarPoint[]).filter((d) => d && typeof d.value === "number");
}

export function MiniChart({ spec }: { spec: ChartSpec }) {
  const pts = toPoints(spec.data);
  if (!pts.length) return null;
  const type = spec.type === "line" ? "line" : "bar";
  const unit = spec.unit ?? "";
  const W = 520;
  const H = 200;
  const padL = 40;
  const padB = 28;
  const padT = 12;
  const plotW = W - padL - 12;
  const plotH = H - padB - padT;
  const max = Math.max(...pts.map((p) => p.value), 0);
  const min = Math.min(...pts.map((p) => p.value), 0);
  const range = max - min || 1;
  const y = (v: number) => padT + plotH - ((v - min) / range) * plotH;
  const zeroY = y(0);

  return (
    <figure className="md-chart">
      {spec.title && <figcaption className="md-chart-title">{spec.title}</figcaption>}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={spec.title || "chart"}>
        {/* zero / baseline */}
        <line x1={padL} y1={zeroY} x2={W - 12} y2={zeroY} stroke="rgba(255,255,255,.12)" strokeWidth="1" />
        {[max, (max + min) / 2, min].map((v, i) => (
          <text key={i} x={padL - 6} y={y(v) + 3} textAnchor="end" className="md-chart-axis">
            {v.toFixed(0)}
            {unit}
          </text>
        ))}

        {type === "bar"
          ? pts.map((p, i) => {
              const bw = plotW / pts.length;
              const x = padL + i * bw + bw * 0.18;
              const w = bw * 0.64;
              const top = Math.min(y(p.value), zeroY);
              const h = Math.abs(zeroY - y(p.value));
              const up = p.value >= 0;
              return (
                <g key={i}>
                  <rect x={x} y={top} width={w} height={Math.max(h, 1)} rx="2" fill={up ? "var(--green)" : "var(--red)"} opacity="0.85" />
                  <text x={x + w / 2} y={H - 10} textAnchor="middle" className="md-chart-axis">
                    {p.label}
                  </text>
                </g>
              );
            })
          : (() => {
              const bw = plotW / Math.max(pts.length - 1, 1);
              const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${padL + i * bw} ${y(p.value)}`).join(" ");
              const area = `${path} L ${padL + (pts.length - 1) * bw} ${zeroY} L ${padL} ${zeroY} Z`;
              return (
                <g>
                  <path d={area} fill="url(#mc-grad)" opacity="0.5" />
                  <path d={path} fill="none" stroke="var(--gold2)" strokeWidth="2" />
                  <defs>
                    <linearGradient id="mc-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {pts.map((p, i) => (
                    <text key={i} x={padL + i * bw} y={H - 10} textAnchor="middle" className="md-chart-axis">
                      {p.label}
                    </text>
                  ))}
                </g>
              );
            })()}
      </svg>
    </figure>
  );
}

type HeatSpec = {
  title?: string;
  x: string[];
  y: string[];
  values: number[][];
};

function heatColor(t: number): string {
  // t in 0..1 → red (low) to gold to green (high)
  if (t < 0.5) {
    const k = t / 0.5;
    return `rgba(255,107,107,${0.18 + 0.62 * (1 - k)})`;
  }
  const k = (t - 0.5) / 0.5;
  return `rgba(63,224,166,${0.18 + 0.62 * k})`;
}

export function Heatmap({ spec }: { spec: HeatSpec }) {
  if (!spec?.values?.length || !spec.x?.length) return null;
  const flat = spec.values.flat().filter((v) => typeof v === "number");
  const max = Math.max(...flat);
  const min = Math.min(...flat);
  const range = max - min || 1;
  return (
    <figure className="md-heatmap">
      {spec.title && <figcaption className="md-chart-title">{spec.title}</figcaption>}
      <div className="md-heat-grid" style={{ gridTemplateColumns: `auto repeat(${spec.x.length}, 1fr)` }}>
        <div className="md-heat-corner" />
        {spec.x.map((c) => (
          <div key={c} className="md-heat-colh">
            {c}
          </div>
        ))}
        {spec.y.map((rlabel, r) => (
          <React.Fragment key={rlabel}>
            <div className="md-heat-rowh">{rlabel}</div>
            {spec.x.map((_, c) => {
              const v = spec.values[r]?.[c];
              const t = typeof v === "number" ? (v - min) / range : 0;
              return (
                <div key={c} className="md-heat-cell" style={{ background: heatColor(t) }} title={`${rlabel} / ${spec.x[c]}: ${v}`}>
                  {typeof v === "number" ? v.toFixed(2) : ""}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </figure>
  );
}

/** Parse a fenced block body into a chart/heatmap node, or null if invalid. */
export function renderFenced(lang: string, body: string, key: string): React.ReactNode | null {
  let spec: unknown;
  try {
    spec = JSON.parse(body);
  } catch {
    return null;
  }
  if (lang === "heatmap") return <Heatmap key={key} spec={spec as HeatSpec} />;
  if (lang === "chart" || lang === "bar" || lang === "line") {
    const s = spec as ChartSpec;
    if (lang !== "chart" && !s.type) s.type = lang as "bar" | "line";
    return <MiniChart key={key} spec={s} />;
  }
  return null;
}
