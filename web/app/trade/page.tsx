"use client";

import { useState } from "react";
import "@/components/trade/trade.css";
import { PAIRS } from "@/components/trade/data";
import { ChartPanel } from "@/components/trade/ChartPanel";
import { SwapBox } from "@/components/trade/SwapBox";
import { Balances } from "@/components/trade/Balances";
import { AiRail } from "@/components/trade/AiRail";

export default function TradePage() {
  const [pairSym, setPairSym] = useState(PAIRS[0].sym);
  const pair = PAIRS.find((p) => p.sym === pairSym) ?? PAIRS[0];

  return (
    <main className="trade-root">
      <div className="terminal wrap">
        <div className="crumbs">
          <span className="tag">Terminal</span>
          <span className="ttl">Trade</span>
          <span className="spacer" />
          <span className="badge">
            <span className="ping" /> Mantle Sepolia · block 8,412,907
          </span>
        </div>

        <div className="grid">
          {/* LEFT: chart + swap + balances */}
          <div className="left">
            <ChartPanel pair={pair} onSelectPair={setPairSym} />
            <SwapBox pair={pair} />
            <Balances />
          </div>

          {/* RIGHT: AI rail */}
          <AiRail />
        </div>

        <footer className="tfoot">
          <div className="brand">
            <span className="dot" /> AUTONOE
          </div>
          <div>
            Built for the Mantle Turing Test 2026 · testnet · not financial advice
          </div>
        </footer>
      </div>
    </main>
  );
}
