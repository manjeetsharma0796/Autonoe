"use client";

import { useState } from "react";
import { CANDLES, STATS, TIMEFRAMES, type Pair } from "./data";
import { PairSelector } from "./PairSelector";

const X0 = 30;
const STEP = 50;
const BW = 13;

function Candles() {
  return (
    <g className="candle">
      {CANDLES.map((c, i) => {
        const [o, cl, hi, lo] = c;
        const x = X0 + i * STEP;
        // lower y = higher price → close above open (smaller y) is "up"
        const up = cl <= o;
        const col = up ? "#3FE0A6" : "#FF6B6B";
        const top = Math.min(o, cl);
        const bot = Math.max(o, cl);
        return (
          <g key={i}>
            <line
              className="wick"
              x1={x}
              x2={x}
              y1={hi}
              y2={lo}
              stroke={col}
              strokeOpacity={0.85}
            />
            <rect
              x={x - BW / 2}
              y={top}
              width={BW}
              height={Math.max(2, bot - top)}
              rx={1.5}
              fill={col}
              fillOpacity={0.85}
            />
          </g>
        );
      })}
    </g>
  );
}

export function ChartPanel({
  pair,
  onSelectPair,
}: {
  pair: Pair;
  onSelectPair: (sym: string) => void;
}) {
  const [tf, setTf] = useState("4H");
  const up = pair.dir === "up";

  return (
    <section className="panel" style={{ gridColumn: "1 / -1" }}>
      <div className="phead">
        <PairSelector pair={pair} onSelect={onSelectPair} />

        <div className="lastpx">
          <span className="v">{pair.px}</span>
          <span className={`ch ${up ? "up" : "down"}`}>
            {up ? "▲ " : "▼ "}
            {pair.ch}
          </span>
        </div>

        <span className="spacer" style={{ flex: 1 }} />

        <div className="tfchips" role="group" aria-label="Timeframe">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              type="button"
              className={`chip ${t === tf ? "on" : ""}`}
              onClick={() => setTf(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="pbody">
        <div className="chartwrap">
          <svg
            className="chart"
            viewBox="0 0 880 320"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Candlestick price chart for mUSD/${pair.sym}`}
          >
            <defs>
              <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#F5A524" stopOpacity=".22" />
                <stop offset="1" stopColor="#F5A524" stopOpacity="0" />
              </linearGradient>
            </defs>

            <g className="grid">
              <line x1="0" y1="40" x2="880" y2="40" />
              <line x1="0" y1="110" x2="880" y2="110" />
              <line x1="0" y1="180" x2="880" y2="180" />
              <line x1="0" y1="250" x2="880" y2="250" />
            </g>

            <path
              d="M30,210 L80,200 130,214 180,178 230,190 280,150 330,162 380,124 430,140 480,98 530,116 580,82 630,100 680,70 730,86 780,54 830,66 L830,300 30,300 Z"
              fill="url(#area)"
            />
            <polyline
              points="30,210 80,200 130,214 180,178 230,190 280,150 330,162 380,124 430,140 480,98 530,116 580,82 630,100 680,70 730,86 780,54 830,66"
              fill="none"
              stroke="#F5A524"
              strokeWidth="1.4"
              strokeOpacity=".55"
              strokeLinejoin="round"
            />

            <Candles />

            <line
              x1="0"
              y1="66"
              x2="880"
              y2="66"
              stroke="#FFCC66"
              strokeWidth="1"
              strokeDasharray="3 5"
              strokeOpacity=".55"
            />

            <text className="axis" x="836" y="44">
              1.30
            </text>
            <text className="axis" x="836" y="114">
              1.26
            </text>
            <text className="axis" x="836" y="184">
              1.22
            </text>
            <text className="axis" x="836" y="254">
              1.18
            </text>

            <text className="axis" x="30" y="316">
              12:00
            </text>
            <text className="axis" x="290" y="316">
              16:00
            </text>
            <text className="axis" x="540" y="316">
              20:00
            </text>
            <text className="axis" x="780" y="316">
              00:00
            </text>
          </svg>
        </div>

        <div className="stats4">
          {STATS.map((s) => (
            <div className="c" key={s.k}>
              <div className="k">{s.k}</div>
              <div className={`n ${s.tone ?? ""}`}>{s.n}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
