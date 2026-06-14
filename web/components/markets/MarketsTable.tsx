"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import styles from "./markets.module.css";
import { getSymbols, type TokenInfo } from "../../lib/api";
import { SortIcon, StarIcon } from "./icons";

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

/** Format a USD price to a readable string. */
function fmtPrice(n: number): string {
  if (n >= 1_000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  return n.toPrecision(4);
}

/** Format a volume number to compact string, e.g. "$1.23M". */
function fmtVolume(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

/** Pick badge class from symbol. Keeps the WMNT/BTC/ETH colours, generic gold for the rest. */
function badgeClass(symbol: string): string {
  if (symbol === "WMNT") return "mnt";
  if (symbol === "BTC") return "btc";
  if (symbol === "ETH") return "eth";
  return "";
}

/** One-or-two-letter glyph for the badge. */
function glyph(symbol: string): string {
  if (symbol === "BTC") return "₿";
  if (symbol === "ETH") return "Ξ";
  if (symbol === "WMNT") return "W";
  return symbol.slice(0, 2);
}

// ── hook ─────────────────────────────────────────────────────────────────────

function useSymbols(q: string) {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    getSymbols(q || undefined)
      .then((data) => {
        setTokens(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message ?? "Failed to load markets");
        setLoading(false);
      });
  }, [q]);

  useEffect(() => {
    fetch();
    // poll every 15 s
    const id = setInterval(fetch, 15_000);
    return () => clearInterval(id);
  }, [fetch]);

  return { tokens, loading, error };
}

// ── component ─────────────────────────────────────────────────────────────────

interface MarketsTableProps {
  /** Search query controlled externally (from MarketStats search input). */
  query: string;
  onQueryChange: (q: string) => void;
  /** Called with the live token list so MarketStats can compute its band. */
  onTokensLoaded?: (tokens: TokenInfo[]) => void;
}

export function MarketsTable({ query, onQueryChange, onTokensLoaded }: MarketsTableProps) {
  const root = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(["WMNT"]),
  );
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { tokens, loading, error } = useSymbols(query);

  // bubble token list up to MarketStats
  useEffect(() => {
    if (tokens.length > 0) onTokensLoaded?.(tokens);
  }, [tokens, onTokensLoaded]);

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

  const toggleFavorite = (symbol: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
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
    let list = tokens.filter((t) => {
      switch (filter) {
        case "favorites":
          return favorites.has(t.symbol);
        case "gainers":
          return t.change24hPct > 0;
        case "losers":
          return t.change24hPct < 0;
        default:
          return true;
      }
    });

    if (sortKey) {
      const factor = sortDir === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        switch (sortKey) {
          case "name":
            return a.symbol.localeCompare(b.symbol) * factor;
          case "price":
            return (a.price - b.price) * factor;
          case "change":
            return (a.change24hPct - b.change24hPct) * factor;
          case "volume":
            return (a.volume24h - b.volume24h) * factor;
        }
      });
    }
    return list;
  }, [tokens, filter, favorites, sortKey, sortDir]);

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
          label="Price (USDT)"
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
        <div className="r sparkcell">On-chain</div>
      </div>

      {loading && (
        <div className={styles.empty}>Loading markets…</div>
      )}

      {!loading && error && (
        <div className={styles.empty}>
          Could not load markets: {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className={styles.empty}>
          {query ? `No markets match "${query}".` : "No markets match this filter."}
        </div>
      )}

      {!loading && !error &&
        rows.map((t) => (
          <MarketRow
            key={t.symbol}
            token={t}
            favorite={favorites.has(t.symbol)}
            onToggleFavorite={() => toggleFavorite(t.symbol)}
          />
        ))
      }

      <div className={styles.mfoot}>
        <span className="ping" /> Live prices from Bybit spot ·
        refreshes every ~15s · on-chain execution for WMNT only
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
  token,
  favorite,
  onToggleFavorite,
}: {
  token: TokenInfo;
  favorite: boolean;
  onToggleFavorite: () => void;
}) {
  const up = token.change24hPct >= 0;
  const slug = token.symbol === "WMNT" ? "mUSD-WMNT" : `mUSD-${token.symbol}`;

  return (
    <Link
      className={`${styles.mrow} row`}
      href={`/trade?pair=${slug}`}
    >
      <button
        type="button"
        className={`${styles.fav} ${favorite ? "on" : ""}`}
        aria-label={
          favorite
            ? `Remove ${token.symbol} from favorites`
            : `Add ${token.symbol} to favorites`
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
        <span className={`b ${badgeClass(token.symbol)}`}>{glyph(token.symbol)}</span>
        <div className="nm">
          <b>mUSD/{token.symbol}</b>
          <small>{token.bybitSymbol}</small>
        </div>
      </div>

      <div className={`${styles.px} r`}>{fmtPrice(token.price)}</div>
      <div className={`${styles.pct} ${up ? "up" : "down"} r pctcell`}>
        {up ? "+" : ""}
        {token.change24hPct.toFixed(2)}%
      </div>
      <div className={`${styles.px} r vol`}>{fmtVolume(token.volume24h)}</div>
      <div className="r sparkcell">
        {token.onchain ? (
          <span className={styles.onchainBadge} title="On-chain AMM execution available">
            on-chain
          </span>
        ) : (
          <span className={styles.advisoryBadge}>advise-only</span>
        )}
      </div>
    </Link>
  );
}
