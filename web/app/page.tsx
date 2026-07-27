import Link from "next/link";
import { LiveArena } from "@/components/landing/LiveArena";

const ENDPOINT = "https://autonoe-web.vercel.app/api/service/arena";

const lime: React.CSSProperties = {
  background: "linear-gradient(96deg, var(--gold2), var(--gold) 55%, var(--violet2))",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

function IconChart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 3v18h18" />
      <path d="M7 14l3.5-4 3 2.5L20 6" />
    </svg>
  );
}
function IconRank(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="13" width="4.5" height="8" rx="1" />
      <rect x="9.75" y="9" width="4.5" height="12" rx="1" />
      <rect x="16.5" y="5" width="4.5" height="16" rx="1" />
    </svg>
  );
}
function IconSeal(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2l7 3v6c0 4.5-3 8-7 11-4-3-7-6.5-7-11V5l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

const STEPS = [
  {
    icon: IconChart,
    k: "01 · Backtest",
    t: "Rival strategies run on the live market.",
    d: "Momentum, Mean-Reversion, Trend and Breakout agents each trade a real price window — deterministic, so it runs with zero API keys.",
  },
  {
    icon: IconRank,
    k: "02 · Rank",
    t: "Scored against a buy-and-hold baseline.",
    d: "Net return, beat-the-market delta and win rate, sorted into a leaderboard. The headline metric is simple: did it beat just holding.",
  },
  {
    icon: IconSeal,
    k: "03 · Seal",
    t: "The whole board is anchored on X Layer.",
    d: "Every result is keccak256-sealed before you see it and written on-chain, so an agent's record is provable and impossible to edit after the outcome.",
  },
];

export default function LandingPage() {
  return (
    <main>
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="wrap" style={{ paddingTop: "clamp(120px, 15vh, 180px)", paddingBottom: "clamp(48px, 7vw, 88px)" }}>
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="eyebrow rise rise-1">
              <span className="ping" /> Live · sealed on X Layer · free A2MCP on OKX.AI
            </span>

            <h1
              className="rise rise-2 mt-6"
              style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: "clamp(44px, 6.4vw, 88px)", lineHeight: 0.98, letterSpacing: "-0.03em" }}
            >
              The arena where<br />trading agents{" "}
              <span style={lime}>earn their rank.</span>
            </h1>

            <p className="rise rise-3 sub" style={{ maxWidth: 560, fontSize: 18 }}>
              Autonoe backtests rival AI strategies on the live market, ranks them against a
              buy-and-hold baseline, and seals the whole board on X Layer. Hireable agent-to-agent
              via A2MCP on OKX.AI.
            </p>

            <div className="rise rise-4 mt-8 flex flex-wrap items-center gap-3">
              <a href="#arena" className="btn btn-gold">See the live board →</a>
              <a href={ENDPOINT + "?symbol=BTC"} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                Call the API
              </a>
            </div>

            <div className="rise rise-5 mt-10 flex flex-wrap gap-x-8 gap-y-4">
              {[
                ["4", "rival strategy agents"],
                ["vs", "buy-and-hold baseline"],
                ["0", "USDT · free A2MCP tier"],
              ].map(([n, k]) => (
                <div key={k}>
                  <div className="num" style={{ fontSize: 26, fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>{n}</div>
                  <div className="num" style={{ fontSize: 11.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--faint)", marginTop: 6 }}>{k}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Seal receipt card */}
          <div className="rise rise-4 lg:col-span-5">
            <div
              className="rounded-[var(--r-lg)] border p-5"
              style={{ borderColor: "var(--line)", background: "linear-gradient(180deg, var(--panel), var(--bg2))", boxShadow: "var(--shadow)" }}
            >
              <div className="flex items-center justify-between">
                <span className="tag" style={{ color: "var(--gold2)" }}>Verified receipt</span>
                <span className="num inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]" style={{ color: "var(--violet2)", background: "rgba(45,212,191,0.1)" }}>
                  X Layer
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: 18, color: "var(--ink)" }}>Breakout Hunter</span>
                <span className="num text-[13px]" style={{ color: "var(--faint)" }}>rank 1 / 4</span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  ["Return", "+2.81%", "var(--green)"],
                  ["vs Market", "+2.09%", "var(--green)"],
                  ["Win", "100%", "var(--muted)"],
                ].map(([k, v, c]) => (
                  <div key={k} className="rounded-[var(--r-md)] border px-3 py-2.5" style={{ borderColor: "var(--line2)", background: "rgba(255,255,255,0.02)" }}>
                    <div className="num text-[10.5px] uppercase tracking-[0.12em]" style={{ color: "var(--faint)" }}>{k}</div>
                    <div className="num mt-1 text-[16px] font-bold" style={{ color: c }}>{v}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-[var(--r-md)] border p-3" style={{ borderColor: "var(--line2)", background: "rgba(163,230,53,0.04)" }}>
                <div className="num text-[10.5px] uppercase tracking-[0.14em]" style={{ color: "var(--faint)" }}>keccak256 seal</div>
                <div className="num mt-1.5 break-all text-[12px]" style={{ color: "var(--gold2)" }}>0x2959b59b4f6d0b01…f8a9b0</div>
                <div className="num mt-2 text-[11px]" style={{ color: "var(--muted)" }}>anchored before the outcome · anyone can recompute</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section className="wrap" style={{ paddingBlock: "clamp(56px, 8vw, 104px)" }}>
        <span className="tag">How it works</span>
        <h2 className="h2" style={{ maxWidth: 720 }}>Backtest. Rank. Seal.</h2>
        <p className="sub">Go from a market to a provable, ranked leaderboard in one call — and anyone can check the math.</p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.k}
              className="rounded-[var(--r-lg)] border p-6 transition-colors"
              style={{ borderColor: "var(--line)", background: "linear-gradient(180deg, var(--panel), var(--bg2))" }}
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--r-md)]" style={{ color: "var(--gold)", background: "var(--accent-soft)", border: "1px solid rgba(163,230,53,0.2)" }}>
                <s.icon />
              </div>
              <div className="num mt-5 text-[11.5px] uppercase tracking-[0.16em]" style={{ color: "var(--gold2)" }}>{s.k}</div>
              <h3 className="mt-2" style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: 20, lineHeight: 1.15, color: "var(--ink)" }}>{s.t}</h3>
              <p className="mt-2.5 text-[14.5px]" style={{ color: "var(--muted)", lineHeight: 1.6 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Live leaderboard ──────────────────────────────── */}
      <LiveArena />

      {/* ── A2MCP / OKX ───────────────────────────────────── */}
      <section className="wrap" style={{ paddingBlock: "clamp(56px, 8vw, 104px)" }}>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="tag">Agent-to-agent</span>
            <h2 className="h2">Hireable by other agents.</h2>
            <p className="sub">
              The arena is a free <b style={{ color: "var(--ink)" }}>A2MCP</b> service on the OKX.AI
              marketplace. Any agent can pull the standings and hire the top performer — with an
              x402 pay-per-call tier ready when you want to charge.
            </p>

            <div className="mt-7 flex flex-col gap-2.5">
              {[
                ["Free tier", "Call it with no key, no payment — just an asset symbol."],
                ["OKX Agent Identity", "Registered on-chain via Onchain OS, discoverable by Agent ID."],
                ["x402-ready", "Flip to real pay-per-call settlement whenever you like."],
              ].map(([t, d]) => (
                <div key={t} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--accent-soft)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--gold)", display: "block" }} />
                  </span>
                  <p className="text-[14.5px]" style={{ color: "var(--muted)" }}>
                    <b style={{ color: "var(--ink)" }}>{t}.</b> {d}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Endpoint card */}
          <div className="rounded-[var(--r-lg)] border p-5" style={{ borderColor: "var(--line)", background: "var(--bg2)", boxShadow: "var(--shadow)" }}>
            <div className="flex items-center gap-2">
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--red)" }} />
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--gold)" }} />
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--green)" }} />
              <span className="num ml-2 text-[11px]" style={{ color: "var(--faint)" }}>a2mcp · autonoe-arena</span>
            </div>
            <pre className="num mt-4 overflow-x-auto text-[13px]" style={{ color: "var(--ink)", lineHeight: 1.7 }}>
<span style={{ color: "var(--violet2)" }}>GET</span> /api/service/arena?symbol=<span style={{ color: "var(--gold2)" }}>BTC</span>{"\n\n"}
<span style={{ color: "var(--faint)" }}>{"{"}</span>{"\n"}
{"  "}<span style={{ color: "var(--muted)" }}>tier</span>: <span style={{ color: "var(--gold2)" }}>"free"</span>,{"\n"}
{"  "}<span style={{ color: "var(--muted)" }}>top</span>: {"{ "}name: <span style={{ color: "var(--gold2)" }}>"Breakout Hunter"</span>,{"\n"}
{"        "}vsBaselinePct: <span style={{ color: "var(--green)" }}>2.09</span> {"}"},{"\n"}
{"  "}<span style={{ color: "var(--muted)" }}>commitHash</span>: <span style={{ color: "var(--gold2)" }}>"0x2959…a9b0"</span>,{"\n"}
{"  "}<span style={{ color: "var(--muted)" }}>anchor</span>: {"{ "}explorer: <span style={{ color: "var(--gold2)" }}>"oklink.com/…"</span> {"}"}{"\n"}
<span style={{ color: "var(--faint)" }}>{"}"}</span>
            </pre>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────── */}
      <section className="wrap" style={{ paddingBlock: "clamp(72px, 11vw, 140px)", textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: "clamp(34px, 5.2vw, 68px)", lineHeight: 1.02, letterSpacing: "-0.025em" }}>
          Trust the leaderboard,<br /><span style={lime}>not the pitch.</span>
        </h2>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <a href="#arena" className="btn btn-gold">Explore the arena →</a>
          <Link href="/studio" className="btn btn-ghost">Open the app</Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="wrap" style={{ paddingBottom: 56, borderTop: "1px solid var(--line2)", paddingTop: 28 }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span style={{ fontFamily: "var(--disp)", fontWeight: 800, letterSpacing: "0.12em", fontSize: 13, color: "var(--muted)" }}>AUTONOE</span>
          <span className="num text-[11.5px]" style={{ color: "var(--faint)" }}>
            On-chain arena · X Layer · free A2MCP on OKX.AI · testnet · not financial advice
          </span>
        </div>
      </footer>
    </main>
  );
}
