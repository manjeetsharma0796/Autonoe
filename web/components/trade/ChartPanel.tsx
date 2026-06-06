"use client";

import { useState } from "react";
import { STATS, type Pair } from "./data";
import { PairSelector } from "./PairSelector";
import { TradingViewChart } from "@/components/charts/TradingViewChart";

export function ChartPanel({
  pair,
  onSelectPair,
}: {
  pair: Pair;
  onSelectPair: (sym: string) => void;
}) {
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
      </div>

      <div className="pbody">
        <div className="chartwrap">
          <TradingViewChart asset={pair.sym} height={360} />
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
