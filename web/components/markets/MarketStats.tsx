"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import styles from "./markets.module.css";
import {
  BoltIcon,
  GridIcon,
  RowsIcon,
  SearchIcon,
  TrendIcon,
} from "./icons";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Page head (eyebrow / title / search) plus the four-up market-stats
 * band. The "Markets listed" figure counts up on scroll, matching the
 * mockup; everything degrades gracefully under prefers-reduced-motion.
 */
export function MarketStats() {
  const root = useRef<HTMLDivElement>(null);

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

      // count-up figure
      const counter = root.current?.querySelector<HTMLElement>(
        "[data-count]",
      );
      if (counter) {
        const end = Number(counter.dataset.count ?? 0);
        const obj = { v: 0 };
        ScrollTrigger.create({
          trigger: counter,
          start: "top 92%",
          once: true,
          onEnter: () => {
            gsap.to(obj, {
              v: end,
              duration: 1.2,
              ease: "power2.out",
              onUpdate: () => {
                counter.textContent = Math.round(obj.v).toLocaleString();
              },
            });
          },
        });
      }
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      <div className={styles.phead}>
        <div className={styles.reveal}>
          <span className="eyebrow">
            <span className="ping" /> Live feed · Mantle Sepolia testnet
          </span>
          <h1 className={styles.h1}>
            Markets <span>against mUSD.</span>
          </h1>
          <p className={styles.sub}>
            One synthetic dollar, every pair. Track price, momentum and depth —
            then click into the <b>terminal</b> where the tribunal is one step
            away.
          </p>
        </div>

        <label className={`${styles.seek} ${styles.reveal}`} aria-label="Search markets">
          <SearchIcon />
          <input type="text" placeholder="Search a market…" />
        </label>
      </div>

      <div className={`${styles.statband} ${styles.reveal}`}>
        <div className={styles.sgrid}>
          <div className={styles.scell}>
            <div className="k">
              <GridIcon />
              Markets listed
            </div>
            <div className="n" data-count="3">
              0
            </div>
            <div className="d">all live · paired to mUSD</div>
          </div>

          <div className={styles.scell}>
            <div className="k">
              <RowsIcon />
              Total mUSD liquidity
            </div>
            <div className="n">
              <span className="u">$</span>4.82<span className="u">M</span>
            </div>
            <div className="d">
              <span className="up">▲ 3.4%</span> vs. 24h ago
            </div>
          </div>

          <div className={styles.scell}>
            <div className="k">
              <TrendIcon />
              24h volume
            </div>
            <div className="n">
              <span className="u">$</span>1.36<span className="u">M</span>
            </div>
            <div className="d">across 3 pairs</div>
          </div>

          <div className={`${styles.scell} ${styles.mover}`}>
            <div className="k">
              <BoltIcon />
              Biggest 24h mover
            </div>
            <div className="n">WMNT</div>
            <div className="d">
              <span className="up">▲ +4.21%</span> · mUSD/WMNT
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
