"use client";

import { useMemo, useState } from "react";
import "@/components/trade/trade.css";
import { PAIRS, type Pair } from "@/components/trade/data";
import { ChartPanel } from "@/components/trade/ChartPanel";
import { SwapBox } from "@/components/trade/SwapBox";
import { Balances } from "@/components/trade/Balances";
import { AiRail } from "@/components/trade/AiRail";
import { useSymbols } from "@/lib/useSymbols";
import type { TokenInfo } from "@/lib/useSymbols";

/** Map a live TokenInfo to the Pair shape used by trade components. */
function tokenToPair(t: TokenInfo): Pair {
  // Badge: first letter, with special characters for well-known tokens.
  const BADGES: Record<string, string> = { BTC: "₿", ETH: "Ξ", WMNT: "W" };
  const SUBS: Record<string, string> = {
    BTC: "Bitcoin",
    ETH: "Ether",
    WMNT: "Wrapped Mantle",
    SOL: "Solana",
    SUI: "Sui",
  };
  const ch = Math.abs(t.change24hPct);
  return {
    sym: t.symbol,
    badge: BADGES[t.symbol] ?? t.symbol[0],
    sub: SUBS[t.symbol] ?? t.symbol,
    px: t.price.toLocaleString(undefined, {
      maximumFractionDigits: t.price < 10 ? 4 : 2,
    }),
    pxNum: t.price,
    ch: `${ch.toFixed(2)}%`,
    dir: t.change24hPct >= 0 ? "up" : "down",
    // rate: how many tokens you get per 1 mUSD (approximated as 1/price since mUSD ≈ $1)
    rate: t.price > 0 ? 1 / t.price : 0,
  };
}

export default function TradePage() {
  const { tokens, loading } = useSymbols(80);

  // Derive live pairs; while loading use the static fallback so UI is never empty.
  const livePairs: Pair[] = useMemo(() => {
    if (tokens.length === 0) return PAIRS;
    return tokens.slice(0, 80).map(tokenToPair);
  }, [tokens]);

  const [pairSym, setPairSym] = useState(PAIRS[0].sym);

  // Keep selected sym valid as livePairs changes.
  const pair =
    livePairs.find((p) => p.sym === pairSym) ?? livePairs[0] ?? PAIRS[0];

  return (
    <main className="trade-root">
      <div className="terminal wrap-wide">
        <div className="crumbs">
          <span className="tag">Terminal</span>
          <span className="ttl">Trade</span>
          <span className="spacer" />
          <span className="badge">
            {loading ? (
              <span className="ping" />
            ) : (
              <span className="ping" style={{ background: "#3FE0A6" }} />
            )}{" "}
            Mantle Sepolia · block 8,412,907
          </span>
        </div>

        <div className="grid">
          {/* LEFT: chart + swap + balances */}
          <div className="left">
            <ChartPanel pair={pair} pairs={livePairs} onSelectPair={setPairSym} />
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
