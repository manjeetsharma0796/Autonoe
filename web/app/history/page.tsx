"use client";

import { useEffect, useState } from "react";
import type { HistoryRecord } from "@autonoe/shared";
import { getHistory } from "@/lib/api";

const MANTLESCAN_BASE = "https://sepolia.mantlescan.xyz/tx";

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function pnlColor(pnl: number | null): string {
  if (pnl === null) return "";
  if (pnl > 0) return "var(--green, #3FE0A6)";
  if (pnl < 0) return "var(--red, #FF6B6B)";
  return "";
}

function HistoryRow({ rec }: { rec: HistoryRecord }) {
  return (
    <tr>
      <td style={{ color: "var(--muted)", fontSize: 12 }}>
        {formatDate(rec.createdAt)}
      </td>
      <td>
        <span
          style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 11,
            background: rec.source === "ai" ? "rgba(245,165,36,.18)" : "rgba(139,92,246,.18)",
            color: rec.source === "ai" ? "var(--gold2, #F5A524)" : "#B79CFF",
          }}
        >
          {rec.source === "ai" ? "AI" : "Human"}
        </span>
      </td>
      <td style={{ fontFamily: "var(--mono, monospace)", fontSize: 13 }}>
        {rec.chosenOptionRef}
      </td>
      <td>
        {rec.judged ? (
          <span style={{ color: "var(--green, #3FE0A6)", fontSize: 13 }}>Judged</span>
        ) : (
          <span style={{ color: "var(--muted)", fontSize: 13 }}>—</span>
        )}
      </td>
      <td
        style={{
          fontFamily: "var(--mono, monospace)",
          fontSize: 13,
          color: pnlColor(rec.pnlMUSD),
        }}
      >
        {rec.pnlMUSD !== null
          ? `${rec.pnlMUSD >= 0 ? "+" : ""}${rec.pnlMUSD.toFixed(2)} mUSD`
          : "—"}
      </td>
      <td>
        {rec.txHash ? (
          <a
            href={`${MANTLESCAN_BASE}/${rec.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--gold2, #F5A524)",
              fontFamily: "var(--mono, monospace)",
              fontSize: 12,
              textDecoration: "none",
            }}
          >
            {rec.txHash.slice(0, 8)}…{rec.txHash.slice(-6)} ↗
          </a>
        ) : (
          <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
        )}
      </td>
    </tr>
  );
}

export default function HistoryPage() {
  const [records, setRecords] = useState<HistoryRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHistory()
      .then((r) => setRecords(r))
      .catch((e) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="wrap" style={{ paddingTop: 140, minHeight: "100vh" }}>
      <span className="tag">Benchmark</span>
      <h1 className="h2">History</h1>
      <p className="sub">
        On-chain DecisionLog records — every thesis judged, executed, and
        settled on Mantle Sepolia.
      </p>

      {loading && (
        <p style={{ color: "var(--muted)", marginTop: 32 }}>Loading history…</p>
      )}

      {error && (
        <p style={{ color: "var(--red, #FF6B6B)", marginTop: 32 }}>
          Could not load history: {error}
        </p>
      )}

      {records && records.length === 0 && !loading && (
        <p style={{ color: "var(--muted)", marginTop: 32 }}>
          No history yet — go to the Studio, generate a thesis and execute a
          trade to see records here.
        </p>
      )}

      {records && records.length > 0 && (
        <div style={{ overflowX: "auto", marginTop: 32 }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "var(--body)",
              fontSize: 14,
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid rgba(255,255,255,.1)",
                  textAlign: "left",
                  color: "var(--muted)",
                  fontSize: 11,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                }}
              >
                <th style={{ padding: "8px 12px 8px 0" }}>Date</th>
                <th style={{ padding: "8px 12px" }}>Source</th>
                <th style={{ padding: "8px 12px" }}>Option</th>
                <th style={{ padding: "8px 12px" }}>Judged</th>
                <th style={{ padding: "8px 12px" }}>PnL</th>
                <th style={{ padding: "8px 12px" }}>Tx</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr
                  key={rec.thesisId}
                  style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}
                >
                  <td style={{ color: "var(--muted)", fontSize: 12, padding: "12px 12px 12px 0" }}>
                    {formatDate(rec.createdAt)}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        background:
                          rec.source === "ai"
                            ? "rgba(245,165,36,.18)"
                            : "rgba(139,92,246,.18)",
                        color:
                          rec.source === "ai"
                            ? "var(--gold2, #F5A524)"
                            : "#B79CFF",
                      }}
                    >
                      {rec.source === "ai" ? "AI" : "Human"}
                    </span>
                  </td>
                  <td
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: 13,
                      padding: "12px",
                    }}
                  >
                    {rec.chosenOptionRef}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {rec.judged ? (
                      <span style={{ color: "var(--green, #3FE0A6)", fontSize: 13 }}>
                        Judged
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: 13 }}>—</span>
                    )}
                  </td>
                  <td
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: 13,
                      color: pnlColor(rec.pnlMUSD),
                      padding: "12px",
                    }}
                  >
                    {rec.pnlMUSD !== null
                      ? `${rec.pnlMUSD >= 0 ? "+" : ""}${rec.pnlMUSD.toFixed(2)} mUSD`
                      : "—"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {rec.txHash ? (
                      <a
                        href={`${MANTLESCAN_BASE}/${rec.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "var(--gold2, #F5A524)",
                          fontFamily: "var(--mono, monospace)",
                          fontSize: 12,
                          textDecoration: "none",
                        }}
                      >
                        {rec.txHash.slice(0, 8)}…{rec.txHash.slice(-6)} ↗
                      </a>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
