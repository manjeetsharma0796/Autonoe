"use client";

// Model-performance leaderboard for the Benchmark page (T-412). Reads
// GET /api/leaderboard (T-207) and ranks models per role by realized outcome.

import { useEffect, useState } from "react";
import type { LeaderboardRow } from "@autonoe/shared";

const ROLE_ORDER = ["thesis", "supporter", "discriminator", "judge", "assistant"] as const;

function roleLabel(role: string): string {
  if (role.startsWith("subagent.")) return role.slice("subagent.".length) + " subagent";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function rank(role: string): number {
  const i = ROLE_ORDER.indexOf(role as (typeof ROLE_ORDER)[number]);
  return i === -1 ? ROLE_ORDER.length : i;
}

export function LeaderboardClient() {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/leaderboard", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`leaderboard ${r.status}`))))
      .then((data: LeaderboardRow[]) => {
        setRows(data);
        setStatus("idle");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, []);

  // Group by role, ranking models within each by avg PnL.
  const byRole = new Map<string, LeaderboardRow[]>();
  for (const r of rows ?? []) {
    const list = byRole.get(r.role) ?? [];
    list.push(r);
    byRole.set(r.role, list);
  }
  const roles = [...byRole.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));

  return (
    <div style={{ marginTop: 40 }}>
      <h2 className="h2" style={{ fontSize: "clamp(22px,3vw,32px)" }}>
        Model leaderboard
      </h2>
      <p className="sub">
        Each AI role&apos;s models ranked by realized outcome across executed
        decisions.
      </p>

      {status === "error" && (
        <div className="panel" style={{ marginTop: 18, padding: 18 }}>
          <p className="sub" style={{ margin: 0 }}>
            Couldn&apos;t reach the server — start the backend to load the leaderboard.
          </p>
        </div>
      )}

      {status === "idle" && roles.length === 0 && (
        <div className="panel" style={{ marginTop: 18, padding: 18 }}>
          <p className="sub" style={{ margin: 0 }}>
            No model performance yet — it populates as decisions are executed and
            their outcomes settle on-chain.
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 18 }}>
        {roles.map(([role, list]) => (
          <div className="panel" key={role} style={{ padding: 0, overflow: "hidden" }}>
            <div className="tag" style={{ padding: "12px 16px" }}>{roleLabel(role)}</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 12 }}>
                  <th style={{ padding: "10px 16px" }}>#</th>
                  <th style={{ padding: "10px 16px" }}>Model</th>
                  <th style={{ padding: "10px 16px", textAlign: "right" }}>Trades</th>
                  <th style={{ padding: "10px 16px", textAlign: "right" }}>Win rate</th>
                  <th style={{ padding: "10px 16px", textAlign: "right" }}>Avg PnL (mUSD)</th>
                </tr>
              </thead>
              <tbody>
                {list
                  .slice()
                  .sort((a, b) => b.avgPnlMUSD - a.avgPnlMUSD)
                  .map((r, i) => (
                    <tr key={`${r.provider}/${r.model}`} style={{ borderTop: "1px solid var(--line)" }}>
                      <td style={{ padding: "10px 16px", color: "var(--muted)" }}>{i + 1}</td>
                      <td style={{ padding: "10px 16px", fontFamily: "var(--mono)" }}>
                        {r.model}
                        <span style={{ color: "var(--muted)" }}> · {r.provider}</span>
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right", fontFamily: "var(--mono)" }}>{r.trades}</td>
                      <td style={{ padding: "10px 16px", textAlign: "right", fontFamily: "var(--mono)" }}>
                        {Math.round(r.winRate * 100)}%
                      </td>
                      <td
                        style={{
                          padding: "10px 16px",
                          textAlign: "right",
                          fontFamily: "var(--mono)",
                          color: r.avgPnlMUSD >= 0 ? "#3FE0A6" : "#FF6B6B",
                        }}
                      >
                        {r.avgPnlMUSD >= 0 ? "+" : ""}
                        {r.avgPnlMUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
