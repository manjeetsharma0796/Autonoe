"use client";

import { useState } from "react";
import type { AssetSymbol } from "@autonoe/shared";
import { STATS, TIMEFRAMES, type Pair } from "./data";
import { PairSelector } from "./PairSelector";
import { PredictionChart } from "./PredictionChart";

/** UI timeframe chip → Bybit kline interval. */
const TF_TO_INTERVAL: Record<string, string> = {
  "5m": "5",
  "15m": "15",
  "1H": "60",
  "4H": "240",
  "1D": "D",
  "1W": "W",
};

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
          <PredictionChart
            asset={pair.sym as AssetSymbol}
            interval={TF_TO_INTERVAL[tf] ?? "240"}
            prediction={{
              direction: up ? "long" : "short",
              lowPct: pair.predLowPct,
              highPct: pair.predHighPct,
            }}
          />
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
