import type { Metadata } from "next";
import styles from "@/components/markets/markets.module.css";
import { MarketStats } from "@/components/markets/MarketStats";
import { MoversStrip } from "@/components/markets/MoversStrip";
import { MarketsTable } from "@/components/markets/MarketsTable";

export const metadata: Metadata = {
  title: "Autonoe - Markets · trade against mUSD",
  description:
    "Track price, momentum and depth for every mUSD pair on Mantle Sepolia.",
};

export default function MarketsPage() {
  return (
    <main>
      <section className={`${styles.markets} wrap`}>
        <MarketStats />
        <MoversStrip />
        <MarketsTable />
      </section>

      <footer className={`${styles.foot} wrap`}>
        <div className="brand">
          <span className="dot" /> AUTONOE
        </div>
        <div>
          Built for the Mantle Turing Test 2026 · testnet · not financial advice
        </div>
      </footer>
    </main>
  );
}
