"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface ArenaRow {
  rank: number;
  agent: string;
  name: string;
  brief: string;
  returnPct: number;
  vsBaselinePct: number;
  winRatePct: number;
  call: string;
}

export interface Arena {
  symbol: string;
  window: { bars: number; interval: string };
  baseline: { returnPct: number };
  leaderboard: ArenaRow[];
  top: { name: string; vsBaselinePct: number; returnPct: number; winRatePct: number };
  commitHash: string;
  anchor: { txHash: string; explorer: string } | null;
}

export const ARENA_SYMBOLS = ["BTC", "ETH", "SOL"] as const;
export type ArenaSymbol = (typeof ARENA_SYMBOLS)[number];

interface ArenaState {
  symbol: ArenaSymbol;
  setSymbol: (s: ArenaSymbol) => void;
  data: Arena | null;
  loading: boolean;
  error: string | null;
}

const Ctx = createContext<ArenaState | null>(null);

/**
 * One arena fetch, shared by the hero receipt and the leaderboard.
 *
 * These two used to be independent: the hero card was hardcoded to
 * "Breakout Hunter +2.81% / +2.09%" while the live board a screen below
 * ranked Mean Reversion first. On a product whose entire claim is
 * "trust the leaderboard, not the pitch", the hero cannot be a mock — so
 * both now read the same object and are incapable of disagreeing.
 */
export function ArenaProvider({ children }: { children: ReactNode }) {
  const [symbol, setSymbol] = useState<ArenaSymbol>("BTC");
  const [cache, setCache] = useState<Record<string, Arena>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const data = cache[symbol] ?? null;

  useEffect(() => {
    if (cache[symbol]) {
      setLoading(false);
      setError(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(`/api/service/arena?symbol=${symbol}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d?.error) setError(String(d.error));
        else setCache((c) => ({ ...c, [symbol]: d as Arena }));
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // `cache` is intentionally omitted: including it would re-run this effect
    // on every successful write and immediately short-circuit, but it also
    // makes the dependency list lie about what triggers a fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const value = useMemo<ArenaState>(
    () => ({ symbol, setSymbol, data, loading: loading && !data, error }),
    [symbol, data, loading, error],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useArena(): ArenaState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useArena must be used inside <ArenaProvider>");
  return v;
}

export const pct = (n: number) => (n > 0 ? "+" : "") + n.toFixed(2) + "%";
export const toneClass = (n: number) =>
  n > 0 ? "text-green" : n < 0 ? "text-red" : "text-muted";
