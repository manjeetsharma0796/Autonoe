"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import styles from "./markets.module.css";
import { BoltIcon, GridIcon, RowsIcon, TrendIcon } from "./icons";
import type { TokenInfo } from "../../lib/api";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Markets the arena backtests its strategy roster against. */
const ARENA_MARKETS = ["BTC", "ETH", "SOL"] as const;

/**
 * Page head (eyebrow / title / search) plus the four-up market-stats band.
 * Accepts `tokens` from a live feed so all four cells are data-driven.
 * The "Markets listed" figure counts up on scroll.
 */
interface MarketStatsProps {
  tokens: TokenInfo[];
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

export function MarketStats({ tokens }: MarketStatsProps) {
  const root = useRef<HTMLDivElement>(null);

  // Derived stats from live token list
  const count = tokens.length;
  const totalVolume = tokens.reduce((s, t) => s + t.volume24h, 0);
  const biggestMover = tokens.reduce<TokenInfo | null>((best, t) => {
    if (!best) return t;
    return Math.abs(t.change24hPct) > Math.abs(best.change24hPct) ? t : best;
  }, null);

  useGSAP(
    () => {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduce) {
        gsap.set(`.${styles.reveal}`, { opacity: 1, y: 0 });
        return;
      }

      gsap.from(".eyebrow", {
        y: 14,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
      });
      gsap.from(`.${styles.h1}`, {
        y: 24,
        opacity: 0,
        duration: 0.85,
        delay: 0.1,
        ease: "power4.out",
      });
      gsap.from([`.${styles.sub}`, `.${styles.seek}`], {
        y: 22,
        opacity: 0,
        stagger: 0.1,
        duration: 0.8,
        delay: 0.35,
        ease: "power3.out",
      });

      gsap.utils.toArray<HTMLElement>(`.${styles.reveal}`).forEach((el) => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%" },
        });
      });
    },
    { scope: root },
  );

  // count-up effect keyed to the actual count value
  const counterRef = useRef<HTMLSpanElement>(null);
  useGSAP(
    () => {
      if (!counterRef.current || count === 0) return;
      const el = counterRef.current;
      const obj = { v: 0 };
      gsap.to(obj, {
        v: count,
        duration: 1.2,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = Math.round(obj.v).toLocaleString();
        },
      });
    },
    { scope: root, dependencies: [count] },
  );

  const moverUp = biggestMover ? biggestMover.change24hPct >= 0 : true;

  return (
    <div ref={root}>
      <div className={styles.phead}>
        <div className={styles.reveal}>
          <span className="eyebrow">
            <span className="ping" /> Live spot feed · public market data
          </span>
          <h1 className={styles.h1}>
            The markets the <span>arena trades.</span>
          </h1>
          <p className={styles.sub}>
            Every pair the strategy agents are scored on. Track price, momentum
            and depth — then open the <b>testnet terminal</b> to run one
            yourself.
          </p>
        </div>

      </div>

      <div className={`${styles.statband} ${styles.reveal}`}>
        <div className={styles.sgrid}>
          <div className={styles.scell}>
            <div className="k">
              <GridIcon />
              Markets listed
            </div>
            <div className="n">
              <span ref={counterRef}>{count > 0 ? count : 0}</span>
            </div>
            <div className="d">all live · public USDT spot pairs</div>
          </div>

          <div className={styles.scell}>
            <div className="k">
              <RowsIcon />
              Total 24h volume
            </div>
            <div className="n">
              {totalVolume > 0 ? (
                <>
                  <span className="u">$</span>
                  {fmtCompact(totalVolume)}
                </>
              ) : (
                "-"
              )}
            </div>
            <div className="d">
              across {count} pair{count !== 1 ? "s" : ""}
            </div>
          </div>

          {/* The arena ranks a fixed roster of deep-liquidity markets. This used
              to count on-chain AMM pairs, which is always 0 against a public
              spot feed and rendered as a bare "-". */}
          <div className={styles.scell}>
            <div className="k">
              <TrendIcon />
              Arena markets
            </div>
            <div className="n">{ARENA_MARKETS.length}</div>
            <div className="d">{ARENA_MARKETS.join(" · ")} ranked every call</div>
          </div>

          <div className={`${styles.scell} ${styles.mover}`}>
            <div className="k">
              <BoltIcon />
              Biggest 24h mover
            </div>
            <div className="n">{biggestMover?.symbol ?? "-"}</div>
            <div className="d">
              {biggestMover ? (
                <>
                  <span className={moverUp ? "up" : "down"}>
                    {moverUp ? "▲" : "▼"} {moverUp ? "+" : ""}
                    {biggestMover.change24hPct.toFixed(2)}%
                  </span>
                  {" "}· mUSD/{biggestMover.symbol}
                </>
              ) : (
                "loading…"
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
