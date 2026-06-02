"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import styles from "./markets.module.css";
import { TOP_GAINERS, TOP_LOSERS, type StripCard } from "./data";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function MoversStrip() {
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

  return (
    <div ref={root} className={styles.stripwrap}>
      <div className={`${styles.striphead} ${styles.gain} ${styles.reveal}`}>
        <span className="swatch" /> Top gainers · 24h
      </div>
      <div className={styles.strip}>
        {TOP_GAINERS.map((card, i) => (
          <Card key={`gain-${i}`} card={card} />
        ))}
      </div>

      <div
        className={`${styles.striphead} ${styles.lose} ${styles.reveal}`}
        style={{ marginTop: 26 }}
      >
        <span className="swatch" /> Top losers · 24h
      </div>
      <div className={styles.strip}>
        {TOP_LOSERS.map((card, i) => (
          <Card key={`lose-${i}`} card={card} />
        ))}
      </div>
    </div>
  );
}

function Card({ card }: { card: StripCard }) {
  return (
    <Link
      href={`/trade?pair=${card.slug}`}
      className={`${styles.gcard} ${styles.reveal}`}
    >
      <span className={`b ${card.badge}`}>{card.glyph}</span>
      <div className="meta">
        <div className="sname">{card.title}</div>
        <div className="sp">{card.sub}</div>
      </div>
      <div className={`chg ${card.direction}`}>{card.change}</div>
    </Link>
  );
}
