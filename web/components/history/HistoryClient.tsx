"use client";

// /history — on-chain DecisionLog records for the agent wallet, a cumulative
// PnL-over-time chart, headline win-rate / PnL stats, and mantlescan links.
// Reads GET /api/history?address=<agent wallet> (T-207). The agent wallet
// address comes from the WalletProvider (T-402).

import { useEffect, useState } from "react";
import type { HistoryRecord } from "@autonoe/shared";
import { addressUrl, txUrl } from "@autonoe/chain";
import { useAgentWallet } from "../wallet/WalletProvider";
import { LeaderboardClient } from "./LeaderboardClient";

function fmtMUSD(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/** Compact cumulative-PnL line over the records (oldest→newest). */
function PnlChart({ records }: { records: HistoryRecord[] }) {
  if (records.length === 0) return null;
  const W = 720;
  const H = 160;
  const PAD = 8;
  let cum = 0;
  const points = records.map((r) => (cum += r.pnlMUSD ?? 0));
  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const span = max - min || 1;
  const dx = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const y = (v: number) => PAD + (H - PAD * 2) * (1 - (v - min) / span);
  const coords = points.map((p, i) => `${PAD + i * dx},${y(p)}`);
  const zeroY = y(0);
  const last = points[points.length - 1]!;
  const up = last >= 0;
  const stroke = up ? "#3FE0A6" : "#FF6B6B";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }} role="img" aria-label="Cumulative PnL">
      <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 5" />
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HistoryClient() {
  const wallet = useAgentWallet();
  const [records, setRecords] = useState<HistoryRecord[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    if (!wallet.address) {
      setRecords(null);
      return;
    }
    const controller = new AbortController();
    setStatus("loading");
    fetch(`/api/history?address=${wallet.address}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`history ${r.status}`))))
      .then((data: HistoryRecord[]) => {
        setRecords(data);
        setStatus("idle");
      })
      .catch((e) => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, [wallet.address]);

  const wins = records?.filter((r) => (r.pnlMUSD ?? 0) > 0).length ?? 0;
  const total = records?.length ?? 0;
  const winRate = total ? Math.round((wins / total) * 100) : 0;
  const cumPnl = records?.reduce((s, r) => s + (r.pnlMUSD ?? 0), 0) ?? 0;

  return (
    <main className="wrap" style={{ paddingTop: 140, minHeight: "100vh" }}>
      <span className="tag">Benchmark</span>
      <h1 className="h2">History</h1>
      <p className="sub">
        On-chain DecisionLog records for your agent wallet, with realized PnL and
        per-trade mantlescan links.
      </p>

      {!wallet.address ? (
        <div className="panel" style={{ marginTop: 28, padding: 24 }}>
          <p className="sub" style={{ margin: 0 }}>
            Create or unlock your agent wallet (top-right wallet drawer) to load its
            on-chain decision history.
          </p>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 14,
              marginTop: 28,
            }}
          >
            {[
              { k: "Trades", v: String(total) },
              { k: "Win rate", v: `${winRate}%` },
              { k: "Cumulative PnL (mUSD)", v: fmtMUSD(cumPnl), tone: cumPnl >= 0 ? "up" : "down" },
            ].map((s) => (
              <div className="panel" key={s.k} style={{ padding: 16 }}>
                <div className="tag" style={{ marginBottom: 6 }}>{s.k}</div>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 24,
                    color: s.tone === "down" ? "#FF6B6B" : s.tone === "up" ? "#3FE0A6" : "var(--ink)",
                  }}
                >
                  {s.v}
                </div>
              </div>
            ))}
          </div>

          {records && records.length > 0 && (
            <div className="panel" style={{ marginTop: 18, padding: 16 }}>
              <div className="tag" style={{ marginBottom: 8 }}>Cumulative PnL over time</div>
              <PnlChart records={records} />
            </div>
          )}

          <div className="panel" style={{ marginTop: 18, padding: 0, overflow: "hidden" }}>
            {status === "loading" && (
              <p className="sub" style={{ padding: 18 }}>Loading on-chain history…</p>
            )}
            {status === "error" && (
              <p className="sub" style={{ padding: 18 }}>
                Couldn&apos;t reach the server — start the backend to load history.
              </p>
            )}
            {status === "idle" && records && records.length === 0 && (
              <p className="sub" style={{ padding: 18 }}>
                No decisions logged yet. Execute an option from Studio or Trade to
                record one on-chain.
              </p>
            )}
            {records && records.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 12 }}>
                    <th style={{ padding: "12px 16px" }}>Date</th>
                    <th style={{ padding: "12px 16px" }}>Source</th>
                    <th style={{ padding: "12px 16px" }}>Option</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>PnL (mUSD)</th>
                    <th style={{ padding: "12px 16px" }}>Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={i} style={{ borderTop: "1px solid var(--line)" }}>
                      <td style={{ padding: "12px 16px", color: "var(--muted)" }}>
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {r.source}{r.judged ? " · judged" : ""}
                      </td>
                      <td style={{ padding: "12px 16px", fontFamily: "var(--mono)" }}>{r.chosenOptionRef}</td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontFamily: "var(--mono)",
                          color: (r.pnlMUSD ?? 0) >= 0 ? "#3FE0A6" : "#FF6B6B",
                        }}
                      >
                        {fmtMUSD(r.pnlMUSD ?? 0)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {r.txHash ? (
                          <a href={txUrl(r.txHash)} target="_blank" rel="noreferrer" style={{ color: "var(--gold2)" }}>
                            view ↗
                          </a>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="sub" style={{ marginTop: 14, fontSize: 13 }}>
            Agent wallet:{" "}
            <a href={addressUrl(wallet.address)} target="_blank" rel="noreferrer" style={{ color: "var(--gold2)" }}>
              {wallet.address} ↗
            </a>
          </p>
        </>
      )}

      <LeaderboardClient />
    </main>
  );
}
