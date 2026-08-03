import Link from "next/link";
import { LiveArena } from "@/components/landing/LiveArena";
import { ArenaProvider } from "@/components/landing/ArenaProvider";
import { HeroReceipt } from "@/components/landing/HeroReceipt";
import { A2mcpSnippet } from "@/components/landing/A2mcpSnippet";

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
    <ArenaProvider>
      <main>
        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="wrap" style={{ paddingTop: "clamp(116px, 14vh, 168px)", paddingBottom: "clamp(48px, 6vw, 80px)" }}>
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
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

            {/* Live seal receipt — same arena object the board below renders */}
            <div className="rise rise-4 lg:col-span-5">
              <HeroReceipt />
            </div>
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────── */}
        <section className="wrap section">
          <span className="tag">How it works</span>
          <h2 className="h2" style={{ maxWidth: 720 }}>Backtest. Rank. Seal.</h2>
          <p className="sub">Go from a market to a provable, ranked leaderboard in one call — and anyone can check the math.</p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.k}
                className="flex flex-col rounded-[var(--r-lg)] border p-6 transition-colors"
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
        <section className="wrap section">
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

            <A2mcpSnippet />
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────── */}
        <section className="wrap" style={{ paddingBlock: "clamp(64px, 9vw, 116px)", textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: "clamp(34px, 5.2vw, 68px)", lineHeight: 1.02, letterSpacing: "-0.025em" }}>
            Trust the leaderboard,<br /><span style={lime}>not the pitch.</span>
          </h2>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a href="#arena" className="btn btn-gold">Explore the arena →</a>
            <Link href="/studio" className="btn btn-ghost">Open the testnet terminal</Link>
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
    </ArenaProvider>
  );
}
