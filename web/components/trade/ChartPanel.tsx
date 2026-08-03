"use client";

import { STATS, type Pair } from "./data";
import { PairSelector } from "./PairSelector";

import { TradingViewChart } from "@/components/charts/TradingViewChart";

/** Fixed tall chart - presets/resize removed per design direction. */
const CHART_HEIGHT = 520;

/** Price with a sensible number of decimals for its magnitude. */
function fmtPrice(n: number): string {
  const dp = n >= 1000 ? 0 : n >= 1 ? 2 : n >= 0.01 ? 4 : 6;
  return n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

function fmtCompact(n?: number): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

export function ChartPanel({
  pair,
  pairs,
  onSelectPair,
}: {
  pair: Pair;
  /** Full live pair list for the dropdown. */
  pairs: Pair[];
  onSelectPair: (sym: string) => void;
}) {
  const up = pair.dir === "up";

  // Derived from the selected pair's live ticker. These four cells used to be a
  // hardcoded constant, so BTC rendered a "24h High" of 1.3018 (a leftover WOKB
  // figure) while trading at 63,172.
  const stats =
    pair.high24h != null && pair.low24h != null
      ? [
          { k: "24h High", n: fmtPrice(pair.high24h), tone: "up" as const },
          { k: "24h Low", n: fmtPrice(pair.low24h), tone: "down" as const },
          { k: "24h Vol (USDT)", n: fmtCompact(pair.vol24h), tone: undefined },
          {
            k: "24h Change",
            n: `${up ? "+" : "-"}${pair.ch}`,
            tone: (up ? "up" : "down") as "up" | "down",
          },
        ]
      : STATS;

  return (
    <section className="panel" style={{ gridColumn: "1 / -1" }}>
      <div className="phead">
        <PairSelector pair={pair} pairs={pairs} onSelect={onSelectPair} />

        <div className="lastpx">
          <span className="v num">{pair.px}</span>
          <span className={`ch ${up ? "up" : "down"}`}>
            {up ? "▲ " : "▼ "}
            {pair.ch}
          </span>
        </div>

        <span className="spacer" style={{ flex: 1 }} />
      </div>

      <div className="pbody chart-pbody">
        <div className="chartshell" style={{ height: CHART_HEIGHT }}>
          <TradingViewChart
            asset={pair.sym}
            bybitSymbol={pair.bybitSymbol}
            height="100%"
          />
        </div>

        <div className="stat-strip">
          {stats.map((s) => (
            <div className="cell" key={s.k}>
              <div className="k">{s.k}</div>
              <div className={`v num ${s.tone ?? ""}`}>{s.n}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
