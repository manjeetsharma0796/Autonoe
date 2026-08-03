"use client";

import { useArena } from "./ArenaProvider";

/**
 * The a2mcp response preview. Reads the same live arena object as the hero and
 * the board rather than restating a frozen sample response.
 */
export function A2mcpSnippet() {
  const { data, symbol, loading } = useArena();

  const top = data?.leaderboard?.[0];
  const name = top ? `"${top.name}"` : loading ? "…" : "…";
  const vs = top ? top.vsBaselinePct.toFixed(2) : "…";
  const hash = data ? `"${data.commitHash.slice(0, 6)}…${data.commitHash.slice(-4)}"` : "…";
  const anchored = data?.anchor ? '"oklink.com/…"' : "null";

  return (
    <div
      className="rounded-[var(--r-lg)] border p-5"
      style={{ borderColor: "var(--line)", background: "var(--bg2)", boxShadow: "var(--shadow)" }}
    >
      <div className="flex items-center gap-2">
        <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--red)" }} />
        <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--gold)" }} />
        <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--green)" }} />
        <span className="num ml-2 text-[11px]" style={{ color: "var(--faint)" }}>
          a2mcp · autonoe-arena
        </span>
        <span
          className="num ml-auto inline-flex items-center gap-1.5 text-[10.5px]"
          style={{ color: data ? "var(--green)" : "var(--faint)" }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: data ? "var(--green)" : "var(--faint)",
              boxShadow: data ? "0 0 8px var(--green)" : "none",
            }}
          />
          {data ? "live" : "…"}
        </span>
      </div>

      <pre className="num mt-4 overflow-x-auto text-[13px]" style={{ color: "var(--ink)", lineHeight: 1.7 }}>
        <span style={{ color: "var(--violet2)" }}>GET</span> /api/service/arena?symbol=
        <span style={{ color: "var(--gold2)" }}>{symbol}</span>
        {"\n\n"}
        <span style={{ color: "var(--faint)" }}>{"{"}</span>
        {"\n"}
        {"  "}
        <span style={{ color: "var(--muted)" }}>tier</span>:{" "}
        <span style={{ color: "var(--gold2)" }}>&quot;free&quot;</span>,{"\n"}
        {"  "}
        <span style={{ color: "var(--muted)" }}>top</span>: {"{ "}name:{" "}
        <span style={{ color: "var(--gold2)" }}>{name}</span>,{"\n"}
        {"        "}vsBaselinePct: <span style={{ color: "var(--green)" }}>{vs}</span> {"}"},{"\n"}
        {"  "}
        <span style={{ color: "var(--muted)" }}>commitHash</span>:{" "}
        <span style={{ color: "var(--gold2)" }}>{hash}</span>,{"\n"}
        {"  "}
        <span style={{ color: "var(--muted)" }}>anchor</span>: {"{ "}explorer:{" "}
        <span style={{ color: "var(--gold2)" }}>{anchored}</span> {"}"}
        {"\n"}
        <span style={{ color: "var(--faint)" }}>{"}"}</span>
      </pre>
    </div>
  );
}
