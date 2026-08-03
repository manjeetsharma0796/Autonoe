"use client";

import { useArena, pct, toneClass } from "./ArenaProvider";

function Shimmer({ w, h = 16 }: { w: number | string; h?: number }) {
  return (
    <div
      className="animate-pulse rounded"
      style={{ width: w, height: h, background: "rgba(255,255,255,0.06)" }}
    />
  );
}

/**
 * The hero's "verified receipt" — the same arena object the leaderboard below
 * renders, so the pitch and the board are always the same numbers.
 */
export function HeroReceipt() {
  const { data, loading, error, symbol } = useArena();
  const top = data?.leaderboard?.[0];

  return (
    <div
      className="rounded-[var(--r-lg)] border p-5"
      style={{
        borderColor: "var(--line)",
        background: "linear-gradient(180deg, var(--panel), var(--bg2))",
        boxShadow: "var(--shadow)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="tag" style={{ color: "var(--gold2)" }}>Verified receipt</span>
        <span
          className="num inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]"
          style={{ color: "var(--violet2)", background: "rgba(45,212,191,0.1)" }}
        >
          X Layer
        </span>
      </div>

      {/* Top agent */}
      <div className="mt-4 flex items-center justify-between gap-3">
        {loading || !top ? (
          <Shimmer w={150} h={20} />
        ) : (
          <span
            className="truncate"
            style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: 18, color: "var(--ink)" }}
          >
            {top.name}
          </span>
        )}
        <span className="num shrink-0 text-[13px]" style={{ color: "var(--faint)" }}>
          {data ? `rank 1 / ${data.leaderboard.length}` : `${symbol} · live`}
        </span>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { k: "Return", v: top?.returnPct, tone: true },
          { k: "vs Market", v: top?.vsBaselinePct, tone: true },
          { k: "Win", v: top?.winRatePct, tone: false, suffix: "%" },
        ].map((cell) => (
          <div
            key={cell.k}
            className="rounded-[var(--r-md)] border px-3 py-2.5"
            style={{ borderColor: "var(--line2)", background: "rgba(255,255,255,0.02)" }}
          >
            <div className="num text-[10.5px] uppercase tracking-[0.12em]" style={{ color: "var(--faint)" }}>
              {cell.k}
            </div>
            {loading || cell.v == null ? (
              <div className="mt-1.5"><Shimmer w="80%" h={14} /></div>
            ) : (
              <div
                className={`num mt-1 text-[16px] font-bold ${cell.tone ? toneClass(cell.v) : ""}`}
                style={cell.tone ? undefined : { color: "var(--muted)" }}
              >
                {cell.suffix ? `${cell.v.toFixed(0)}${cell.suffix}` : pct(cell.v)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Seal */}
      <div
        className="mt-4 rounded-[var(--r-md)] border p-3"
        style={{ borderColor: "var(--line2)", background: "rgba(163,230,53,0.04)" }}
      >
        <div className="num text-[10.5px] uppercase tracking-[0.14em]" style={{ color: "var(--faint)" }}>
          keccak256 seal
        </div>
        {loading || !data ? (
          <div className="mt-2"><Shimmer w="90%" h={13} /></div>
        ) : (
          <div className="num mt-1.5 break-all text-[12px]" style={{ color: "var(--gold2)" }}>
            {data.commitHash.slice(0, 18)}…{data.commitHash.slice(-6)}
          </div>
        )}
        <div className="num mt-2 text-[11px]" style={{ color: "var(--muted)" }}>
          anchored before the outcome · anyone can recompute
        </div>
      </div>

      {/* Anchor tx */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="num text-[11px]" style={{ color: "var(--faint)" }}>
          {data ? `${data.symbol} · ${data.window.bars}×${data.window.interval}` : " "}
        </span>
        {data?.anchor ? (
          <a
            href={data.anchor.explorer}
            target="_blank"
            rel="noopener noreferrer"
            className="num text-[11px] transition-colors hover:text-[var(--gold2)]"
            style={{ color: "var(--violet2)" }}
          >
            view anchor tx ↗
          </a>
        ) : (
          <span className="num text-[11px]" style={{ color: "var(--faint)" }}>
            {error ? "feed unavailable" : loading ? "sealing…" : "recompute to verify"}
          </span>
        )}
      </div>
    </div>
  );
}
