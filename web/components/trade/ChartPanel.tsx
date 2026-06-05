"use client";

import { useEffect, useState } from "react";
import { STATS, TIMEFRAMES, type Pair } from "./data";
import { PairSelector } from "./PairSelector";
import { PredictionChart } from "@/components/charts/PredictionChart";
import { getCandles, type Candle } from "@/lib/api";

// Map UI timeframe labels to Bybit interval strings
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
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const up = pair.dir === "up";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const interval = TF_TO_INTERVAL[tf] ?? "60";
    getCandles(pair.sym, interval, 100)
      .then((data) => {
        if (!cancelled) setCandles(data);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load candles");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pair.sym, tf]);

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
          {loading && candles.length === 0 && (
            <div
              style={{
                height: 320,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--faint)",
                fontSize: 13,
                fontFamily: "var(--mono)",
              }}
            >
              Loading candles…
            </div>
          )}
          {error && !loading && (
            <div
              style={{
                height: 320,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--red)",
                fontSize: 13,
                fontFamily: "var(--mono)",
              }}
            >
              {error}
            </div>
          )}
          {!error && candles.length > 0 && (
            <PredictionChart candles={candles} width={880} height={320} tooltip />
          )}
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
