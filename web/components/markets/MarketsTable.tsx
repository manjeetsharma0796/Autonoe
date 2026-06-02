"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import styles from "./markets.module.css";
import { MARKETS, type Market } from "./data";
import { SortIcon, Sparkline, StarIcon } from "./icons";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Filter = "all" | "favorites" | "gainers" | "losers";
type SortKey = "name" | "price" | "change" | "volume";
type SortDir = "asc" | "desc";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "favorites", label: "Favorites" },
  { key: "gainers", label: "Gainers" },
  { key: "losers", label: "Losers" },
];

const SPARK_GREEN = "#3FE0A6";
const SPARK_RED = "#FF6B6B";

export function MarketsTable() {
  const root = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(MARKETS.filter((m) => m.defaultFavorite).map((m) => m.pair)),
  );
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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

  const toggleFavorite = (pair: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(pair)) next.delete(pair);
      else next.add(pair);
      return next;
    });
  };

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const rows = useMemo(() => {
    let list = MARKETS.filter((m) => {
      switch (filter) {
        case "favorites":
          return favorites.has(m.pair);
        case "gainers":
          return m.change24h > 0;
        case "losers":
          return m.change24h < 0;
        default:
          return true;
      }
    });

    if (sortKey) {
      const factor = sortDir === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case "name":
            cmp = a.pair.localeCompare(b.pair);
            break;
          case "price":
            cmp = a.priceValue - b.priceValue;
            break;
          case "change":
            cmp = a.change24h - b.change24h;
            break;
          case "volume":
            cmp = a.volumeValue - b.volumeValue;
            break;
        }
        return cmp * factor;
      });
    }
    return list;
  }, [filter, favorites, sortKey, sortDir]);

  return (
    <div ref={root} className={`${styles.mk} ${styles.reveal}`}>
      <div className={styles.mhead}>
        <h2>All markets</h2>
        <div className={styles.filters}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`${styles.chip} ${filter === f.key ? "on" : ""}`}
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`${styles.mrow} head`}>
        <div />
        <SortHeader
          label="Market"
          active={sortKey === "name"}
          onClick={() => onSort("name")}
        />
        <SortHeader
          className="r"
          label="Price (mUSD)"
          active={sortKey === "price"}
          onClick={() => onSort("price")}
        />
        <SortHeader
          className="r pctcell"
          label="24h %"
          active={sortKey === "change"}
          onClick={() => onSort("change")}
        />
        <SortHeader
          className="r vol"
          label="24h Volume"
          active={sortKey === "volume"}
          onClick={() => onSort("volume")}
        />
        <div className="r sparkcell">Last 7d</div>
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>No markets match this filter.</div>
      ) : (
        rows.map((m) => (
          <MarketRow
            key={m.pair}
            market={m}
            favorite={favorites.has(m.pair)}
            onToggleFavorite={() => toggleFavorite(m.pair)}
          />
        ))
      )}

      <div className={styles.mfoot}>
        <span className="ping" /> Prices from the market subagent feed ·
        sparklines from cached OHLC · refreshes every ~15s
      </div>
    </div>
  );
}

function SortHeader({
  label,
  active,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <button
        type="button"
        className={`sortable ${active ? "active" : ""}`}
        onClick={onClick}
      >
        {label}
        <SortIcon />
      </button>
    </div>
  );
}

function MarketRow({
  market,
  favorite,
  onToggleFavorite,
}: {
  market: Market;
  favorite: boolean;
  onToggleFavorite: () => void;
}) {
  const up = market.change24h >= 0;
  const sparkColor = up ? SPARK_GREEN : SPARK_RED;

  return (
    <Link
      className={`${styles.mrow} row`}
      href={`/trade?pair=${market.slug}`}
    >
      <button
        type="button"
        className={`${styles.fav} ${favorite ? "on" : ""}`}
        aria-label={
          favorite
            ? `Remove ${market.pair} from favorites`
            : `Add ${market.pair} to favorites`
        }
        aria-pressed={favorite}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite();
        }}
      >
        <StarIcon filled={favorite} />
      </button>

      <div className={styles.sym}>
        <span className={`b ${market.badge}`}>{market.glyph}</span>
        <div className="nm">
          <b>{market.pair}</b>
          <small>{market.name}</small>
        </div>
      </div>

      <div className={`${styles.px} r`}>{market.price}</div>
      <div className={`${styles.pct} ${up ? "up" : "down"} r pctcell`}>
        {up ? "+" : ""}
        {market.change24h.toFixed(2)}%
      </div>
      <div className={`${styles.px} r vol`}>{market.volume}</div>
      <div className="sparkcell">
        <Sparkline
          className={styles.spark}
          points={market.sparkPoints}
          color={sparkColor}
          gradientId={`spark-${market.slug}`}
        />
      </div>
    </Link>
  );
}
