"use client";

import { useEffect, useState } from "react";

type Row = {
  rank: number;
  agent: string;
  name: string;
  brief: string;
  returnPct: number;
  vsBaselinePct: number;
  winRatePct: number;
  call: string;
};
type Arena = {
  symbol: string;
  window: { bars: number; interval: string };
  baseline: { returnPct: number };
  leaderboard: Row[];
  top: { name: string };
  commitHash: string;
  anchor: { txHash: string; explorer: string } | null;
};

const SYMBOLS = ["BTC", "ETH", "SOL"] as const;
const pct = (n: number) => (n > 0 ? "+" : "") + n.toFixed(2) + "%";
const toneClass = (n: number) => (n > 0 ? "text-green" : n < 0 ? "text-red" : "text-muted");

// Responsive column grid: tighter on mobile so the strategy-name column keeps
// real width; the wide desktop layout kicks in at sm.
const COLS =
  "grid grid-cols-[26px_1fr_54px_62px_40px] gap-2 sm:grid-cols-[40px_1fr_96px_104px_72px] sm:gap-3";
const PADX = "px-3 sm:px-5";

export function LiveArena() {
  const [symbol, setSymbol] = useState<string>("BTC");
  const [data, setData] = useState<Arena | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(`/api/service/arena?symbol=${symbol}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d?.error) setError(String(d.error));
        else setData(d as Arena);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [symbol]);

  return (
    <section id="arena" className="wrap" style={{ paddingBlock: "clamp(72px, 10vw, 128px)" }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow"><span className="ping" /> Live leaderboard</span>
          <h2 className="h2">The board is the pitch.</h2>
          <p className="sub">
            Four rival strategy agents, backtested on a live price window and ranked by how much
            they beat a buy-and-hold baseline. Every board is keccak256-sealed before you see it.
          </p>
        </div>

        {/* Symbol tabs */}
        <div
          className="flex gap-1 rounded-[var(--r-pill)] border p-1"
          style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.02)" }}
          role="tablist"
          aria-label="Market"
        >
          {SYMBOLS.map((s) => {
            const on = s === symbol;
            return (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setSymbol(s)}
                className="num cursor-pointer rounded-[var(--r-pill)] px-4 py-2 text-[13px] font-medium transition-colors"
                style={{
                  color: on ? "#0a1400" : "var(--muted)",
                  background: on ? "linear-gradient(180deg,var(--gold2),var(--gold))" : "transparent",
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Board */}
      <div
        className="mt-8 overflow-hidden rounded-[var(--r-lg)] border"
        style={{ borderColor: "var(--line)", background: "linear-gradient(180deg, var(--panel), var(--bg2))", boxShadow: "var(--shadow)" }}
      >
        {/* Column header */}
        <div
          className={`num ${COLS} ${PADX} items-center py-3 text-[10.5px] uppercase tracking-[0.14em] sm:text-[11px] sm:tracking-[0.16em]`}
          style={{ color: "var(--faint)", borderBottom: "1px solid var(--line)" }}
        >
          <span></span>
          <span>Strategy agent</span>
          <span className="text-right">Return</span>
          <span className="text-right">vs Mkt</span>
          <span className="text-right">Win</span>
        </div>

        {loading && !data ? (
          <div>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`${COLS} ${PADX} items-center py-4`} style={{ borderTop: "1px solid var(--line2)" }}>
                <div className="h-6 w-6 animate-pulse rounded-md" style={{ background: "rgba(255,255,255,0.06)" }} />
                <div className="h-4 w-32 animate-pulse rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
                <div className="ml-auto h-4 w-10 animate-pulse rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
                <div className="ml-auto h-4 w-12 animate-pulse rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
                <div className="ml-auto h-4 w-8 animate-pulse rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-5 py-10 text-center">
            <p className="num text-[13px]" style={{ color: "var(--muted)" }}>
              Market feed unavailable for {symbol} right now. The seal + ranking logic still runs — try another market.
            </p>
          </div>
        ) : data ? (
          <>
            <div>
              {data.leaderboard.map((r) => {
                const win = r.rank === 1;
                return (
                  <div
                    key={r.agent}
                    className={`${COLS} ${PADX} items-center py-4 transition-colors`}
                    style={{
                      borderTop: "1px solid var(--line2)",
                      background: win ? "linear-gradient(90deg, rgba(163,230,53,0.08), transparent 70%)" : "transparent",
                    }}
                  >
                    <span
                      className="num inline-flex h-6 w-6 items-center justify-center rounded-md text-[12px] font-bold"
                      style={{
                        color: win ? "#0a1400" : "var(--muted)",
                        background: win ? "var(--gold)" : "rgba(255,255,255,0.05)",
                      }}
                    >
                      {r.rank}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold sm:text-[16px]" style={{ fontFamily: "var(--disp)", color: "var(--ink)" }}>
                        {r.name}
                      </span>
                      <span className="hidden truncate text-[12.5px] sm:block" style={{ color: "var(--faint)" }}>{r.brief}</span>
                    </span>
                    <span className={`num text-right text-[13px] sm:text-[15px] ${toneClass(r.returnPct)}`}>{pct(r.returnPct)}</span>
                    <span className={`num text-right text-[13px] font-bold sm:text-[15px] ${toneClass(r.vsBaselinePct)}`}>{pct(r.vsBaselinePct)}</span>
                    <span className="num text-right text-[13px] sm:text-[15px]" style={{ color: "var(--muted)" }}>{r.winRatePct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>

            {/* Baseline + seal footer */}
            <div
              className={`${PADX} flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4`}
              style={{ borderTop: "1px solid var(--line)", background: "rgba(255,255,255,0.015)" }}
            >
              <span className="num text-[12.5px]" style={{ color: "var(--muted)" }}>
                Baseline · Buy &amp; Hold{" "}
                <b className={toneClass(data.baseline.returnPct)}>{pct(data.baseline.returnPct)}</b>
                <span style={{ color: "var(--faint)" }}> · {data.symbol} · {data.window.bars}×{data.window.interval}</span>
              </span>
              <span className="num flex items-center gap-2 text-[11.5px]" style={{ color: "var(--faint)" }}>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
                  style={{ color: "var(--violet2)", background: "rgba(45,212,191,0.1)" }}
                >
                  Sealed
                </span>
                {data.anchor ? (
                  <a href={data.anchor.explorer} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--gold2)]">
                    {data.commitHash.slice(0, 10)}…{data.commitHash.slice(-6)} ↗
                  </a>
                ) : (
                  <span>{data.commitHash.slice(0, 10)}…{data.commitHash.slice(-6)} · recompute to verify</span>
                )}
              </span>
            </div>
          </>
        ) : null}
      </div>

      <p className="num mt-4 text-center text-[12px]" style={{ color: "var(--faint)" }}>
        Live from <span style={{ color: "var(--muted)" }}>GET /api/service/arena?symbol={symbol}</span> · deterministic, recomputable, no API key required
      </p>
    </section>
  );
}
