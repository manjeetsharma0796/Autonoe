import type { Metadata } from "next";
import styles from "@/components/markets/markets.module.css";
import { MarketsShell } from "@/components/markets/MarketsShell";

export const metadata: Metadata = {
  title: "Autonoe — Markets · the arena's price feed",
  description:
    "Live spot prices for every market Autonoe's strategy agents are scored on.",
};

export default function MarketsPage() {
  return (
    <main>
      <section className={`${styles.markets} wrap`}>
        <MarketsShell />
      </section>

      <footer className={`${styles.foot} wrap`}>
        <div className="brand">
          <span className="dot" /> AUTONOE
        </div>
        <div>
          Testnet · not financial advice
        </div>
      </footer>
    </main>
  );
}
