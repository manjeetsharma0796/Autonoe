"use client";

import Link from "next/link";
import s from "./landing.module.css";
import { useReveal } from "./useReveal";

type Market = {
  badge: string;
  name: string;
  desc: string;
  price: string;
  change: string;
  dir: "up" | "down";
  points: string;
};

const MARKETS: Market[] = [
  {
    badge: "W",
    name: "WMNT",
    desc: "Wrapped Mantle",
    price: "1.2843",
    change: "+4.21%",
    dir: "up",
    points: "0,26 28,22 56,24 84,16 112,18 140,9 168,12 200,5",
  },
  {
    badge: "₿",
    name: "BTC",
    desc: "Test Bitcoin",
    price: "64,210",
    change: "-1.08%",
    dir: "down",
    points: "0,8 28,12 56,10 84,16 112,14 140,20 168,18 200,24",
  },
  {
    badge: "Ξ",
    name: "ETH",
    desc: "Test Ether",
    price: "3,488",
    change: "+2.74%",
    dir: "up",
    points: "0,20 28,18 56,21 84,13 112,15 140,12 168,8 200,10",
  },
];

export function MarketsPreview() {
  const root = useReveal(s.reveal);

  return (
    <section ref={root} id="markets" className={`${s.section} wrap`}>
      <div className={s.reveal}>
        <span className="tag">Markets</span>
        <h2 className="h2">Trade against mUSD.</h2>
        <p className="sub">
          One synthetic dollar, every pair. Pick a market and the terminal — and
          the tribunal — are one click away.
        </p>
      </div>

      <div className={`${s.mk} ${s.reveal}`}>
        <div className={`${s.mrow} ${s.mhead}`}>
          <div>Market</div>
          <div>Price (mUSD)</div>
          <div>24h</div>
          <div>Last 7d</div>
        </div>

        {MARKETS.map((m) => (
          <Link
            href="/trade"
            className={`${s.mrow} ${s.mlink}`}
            key={m.name}
          >
            <div className={s.sym}>
              <span className={s.symB}>{m.badge}</span>
              <div>
                {m.name} <small>{m.desc}</small>
              </div>
            </div>
            <div className={s.px}>{m.price}</div>
            <div className={`${s.px} ${m.dir === "up" ? s.up : s.down}`}>
              {m.change}
            </div>
            <svg
              className={s.spark}
              viewBox="0 0 200 34"
              preserveAspectRatio="none"
            >
              <polyline
                fill="none"
                stroke={m.dir === "up" ? "#3FE0A6" : "#FF6B6B"}
                strokeWidth="2"
                points={m.points}
              />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  );
}
