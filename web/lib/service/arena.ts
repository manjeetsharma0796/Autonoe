// Autonoe's core differentiator: a reproducible on-chain ARENA (not a verdict).
// Several strategy agents are backtested over a live price window against a
// buy-and-hold baseline, ranked into a leaderboard by how much they beat the
// market, and the whole result is commit-reveal sealed. No LLM, no store, fully
// deterministic -> it works with zero API keys and anyone can recompute the seal.
import { canonicalJson, hashSeal } from "@/lib/commitment";

export type Call = "long" | "flat";

export interface AgentResult {
  rank: number;
  agent: string; // stable key
  name: string;
  brief: string;
  returnPct: number;
  vsBaselinePct: number; // the headline metric: return minus buy-and-hold
  winRatePct: number;
  trades: number;
  call: Call; // the agent's current signal on the latest bar
}

export interface Arena {
  v: 1;
  service: "autonoe-arena";
  symbol: string;
  window: { bars: number; interval: string; from: number; to: number };
  baseline: { strategy: "buy-and-hold"; returnPct: number };
  leaderboard: AgentResult[];
  top: Omit<AgentResult, "rank" | "brief">;
  committedAt: number;
}

// Binance public market-data host: globally reachable (no geo-block, no key),
// unlike api.bybit.com which 403s from US datacenter IPs (e.g. Vercel iad1).
const KLINE_BASE = process.env.KLINE_BASE ?? "https://data-api.binance.vision";

function normalizeSymbol(raw: string): string {
  const s = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!s) throw new Error("empty symbol");
  return s.endsWith("USDT") ? s : `${s}USDT`;
}

async function fetchCloses(symbol: string, limit = 200): Promise<{ closes: number[]; firstTs: number; lastTs: number }> {
  const url = `${KLINE_BASE}/api/v3/klines?symbol=${symbol}&interval=1h&limit=${limit}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`market data ${res.status}`);
  // Binance returns oldest->newest rows: [openTime,open,high,low,close,volume,closeTime,...].
  const rows = (await res.json()) as unknown[];
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("unknown or empty market");
  const closes = rows.map((r) => Number((r as string[])[4]));
  if (closes.some((n) => !Number.isFinite(n) || n <= 0) || closes.length < 60) {
    throw new Error("insufficient price history");
  }
  const first = Number((rows[0] as string[])[0]);
  const last = Number((rows[rows.length - 1] as string[])[0]);
  return { closes, firstTs: first, lastTs: last };
}

// ---- causal indicator series (index i uses only data through i) ----

function smaSeries(v: number[], p: number): number[] {
  const out = new Array<number>(v.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    sum += v[i];
    if (i >= p) sum -= v[i - p];
    if (i >= p - 1) out[i] = sum / p;
  }
  return out;
}

function rsiSeries(closes: number[], period = 14): number[] {
  const out = new Array<number>(closes.length).fill(NaN);
  if (closes.length < period + 1) return out;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) avgGain += d;
    else avgLoss -= d;
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function rollingExtreme(v: number[], p: number, kind: "high" | "low"): number[] {
  const out = new Array<number>(v.length).fill(NaN);
  for (let i = p - 1; i < v.length; i++) {
    let m = kind === "high" ? -Infinity : Infinity;
    for (let j = i - p + 1; j <= i; j++) m = kind === "high" ? Math.max(m, v[j]) : Math.min(m, v[j]);
    out[i] = m;
  }
  return out;
}

interface Indicators {
  rsi: number[];
  smaFast: number[];
  smaSlow: number[];
  trendMa: number[];
  high20: number[];
  low10: number[];
}

interface Strategy {
  key: string;
  name: string;
  brief: string;
  /** 0 (flat) or 1 (long) per bar, decided causally. */
  positions: (closes: number[], ind: Indicators) => number[];
}

const STRATEGIES: Strategy[] = [
  {
    key: "momentum",
    name: "Momentum Rider",
    brief: "Long while price holds above its 50-bar average and RSI stays above 50.",
    positions: (c, ind) => c.map((_, i) => (i > 0 && c[i] > ind.trendMa[i] && ind.rsi[i] > 50 ? 1 : 0)),
  },
  {
    key: "mean-reversion",
    name: "Mean Reversion",
    brief: "Buy oversold (RSI below 30), exit as it reverts back above 55.",
    positions: (c, ind) => {
      const out = new Array<number>(c.length).fill(0);
      let inPos = 0;
      for (let i = 0; i < c.length; i++) {
        if (inPos === 0 && ind.rsi[i] < 30) inPos = 1;
        else if (inPos === 1 && ind.rsi[i] > 55) inPos = 0;
        out[i] = inPos;
      }
      return out;
    },
  },
  {
    key: "trend-cross",
    name: "Trend Follower",
    brief: "Long when the fast average crosses above the slow average.",
    positions: (c, ind) => c.map((_, i) => (ind.smaFast[i] > ind.smaSlow[i] ? 1 : 0)),
  },
  {
    key: "breakout",
    name: "Breakout Hunter",
    brief: "Enter on a fresh 20-bar high, exit on a 10-bar low.",
    positions: (c, ind) => {
      const out = new Array<number>(c.length).fill(0);
      let inPos = 0;
      for (let i = 1; i < c.length; i++) {
        if (inPos === 0 && Number.isFinite(ind.high20[i - 1]) && c[i] >= ind.high20[i - 1]) inPos = 1;
        else if (inPos === 1 && Number.isFinite(ind.low10[i - 1]) && c[i] <= ind.low10[i - 1]) inPos = 0;
        out[i] = inPos;
      }
      return out;
    },
  },
];

function backtest(closes: number[], positions: number[]): { returnPct: number; winRatePct: number; trades: number; call: Call } {
  // Compounded equity: position decided at bar i-1 earns bar i's move (no lookahead).
  let equity = 1;
  for (let i = 1; i < closes.length; i++) {
    const pos = positions[i - 1] === 1 ? 1 : 0;
    equity *= 1 + pos * ((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  // Per-trade win rate from position transitions.
  let entry: number | null = null;
  let wins = 0;
  let trades = 0;
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] === 1 && positions[i - 1] === 0) entry = closes[i];
    else if (positions[i] === 0 && positions[i - 1] === 1 && entry !== null) {
      trades++;
      if (closes[i] > entry) wins++;
      entry = null;
    }
  }
  if (entry !== null) {
    trades++;
    if (closes[closes.length - 1] > entry) wins++;
  }
  return {
    returnPct: round((equity - 1) * 100),
    winRatePct: trades ? round((wins / trades) * 100) : 0,
    trades,
    call: positions[positions.length - 1] === 1 ? "long" : "flat",
  };
}

function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

export async function computeArena(input: { symbol: string }): Promise<{ arena: Arena; commitment: string; hash: `0x${string}` }> {
  const symbol = normalizeSymbol(input.symbol);
  const { closes, firstTs, lastTs } = await fetchCloses(symbol);

  const ind: Indicators = {
    rsi: rsiSeries(closes, 14),
    smaFast: smaSeries(closes, 10),
    smaSlow: smaSeries(closes, 30),
    trendMa: smaSeries(closes, 50),
    high20: rollingExtreme(closes, 20, "high"),
    low10: rollingExtreme(closes, 10, "low"),
  };

  const baselineReturn = round(((closes[closes.length - 1] - closes[0]) / closes[0]) * 100);

  const scored = STRATEGIES.map((s) => {
    const bt = backtest(closes, s.positions(closes, ind));
    return {
      agent: s.key,
      name: s.name,
      brief: s.brief,
      returnPct: bt.returnPct,
      vsBaselinePct: round(bt.returnPct - baselineReturn),
      winRatePct: bt.winRatePct,
      trades: bt.trades,
      call: bt.call,
    };
  });

  // Rank by how much each agent beat the market (the headline metric).
  scored.sort((a, b) => b.vsBaselinePct - a.vsBaselinePct || b.returnPct - a.returnPct);
  const leaderboard: AgentResult[] = scored.map((r, i) => ({ rank: i + 1, ...r }));
  const winner = scored[0];

  const arena: Arena = {
    v: 1,
    service: "autonoe-arena",
    symbol,
    window: { bars: closes.length, interval: "1h", from: firstTs, to: lastTs },
    baseline: { strategy: "buy-and-hold", returnPct: baselineReturn },
    leaderboard,
    top: {
      agent: winner.agent,
      name: winner.name,
      returnPct: winner.returnPct,
      vsBaselinePct: winner.vsBaselinePct,
      winRatePct: winner.winRatePct,
      trades: winner.trades,
      call: winner.call,
    },
    committedAt: Date.now(),
  };

  return { arena, commitment: canonicalJson(arena), hash: hashSeal(arena) };
}
