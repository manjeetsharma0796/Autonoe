// T-204 — data subagents. Each gathers one kind of signal and returns a
// ReasoningTrace (shown via "Show thinking") plus a text blob the thesis agent
// reads. Data is mocked deterministically until the chain lib (T-108) + market
// APIs are wired; the interface stays identical, so swapping in real feeds later
// is a drop-in change.

import type { AIRole, ReasoningTrace } from '@autonoe/shared';
import { SUBAGENT_ROLES } from '@autonoe/shared';

export interface SubagentResult {
  trace: ReasoningTrace;
  /** Text the thesis agent injects into its prompt. */
  context: string;
}

type Subagent = (intent: string) => Promise<SubagentResult>;

const onchain: Subagent = async () => ({
  context:
    'On-chain (Mantle Sepolia AMM): mUSD/WMNT mid 1.2843, depth ~42k mUSD, 24h vol +18%. ' +
    'mUSD/MockETH 3,488, thinning bids. mUSD/MockBTC 64,210, stable depth.',
  trace: {
    role: 'subagent.onchain',
    summary: 'Read AMM reserves + recent swaps for the three mUSD pairs.',
    steps: [
      { label: 'Reserves', detail: 'mUSD/WMNT pool ~42k mUSD-side liquidity; price 1.2843.' },
      { label: 'Flow', detail: '24h volume up ~18%, buy-weighted on WMNT.' },
    ],
  },
});

const market: Subagent = async () => ({
  context:
    'Market (CEX reference): WMNT +4.2% 24h, higher highs on 4h. ETH +2.7%, BTC -1.1%. ' +
    'Funding neutral; volatility compressing into the session.',
  trace: {
    role: 'subagent.market',
    summary: 'Pulled 24h/4h OHLC + funding for the candidate assets.',
    steps: [
      { label: 'Trend', detail: 'WMNT printing higher highs on the 4h candle.' },
      { label: 'Breadth', detail: 'ETH supportive (+2.7%), BTC soft (-1.1%).' },
    ],
  },
});

const news: Subagent = async () => ({
  context:
    'News/sentiment: Mantle ecosystem incentives announced this week; social mentions of MNT ' +
    'up notably. No adverse macro prints scheduled in the next 24h.',
  trace: {
    role: 'subagent.news',
    summary: 'Summarized recent headlines + social sentiment for the assets.',
    steps: [
      { label: 'Catalyst', detail: 'Fresh Mantle ecosystem incentive narrative.' },
      { label: 'Macro', detail: 'No high-impact scheduled events in window.' },
    ],
  },
});

const indicators: Subagent = async () => ({
  context:
    'Indicators (computed): WMNT RSI(14) 61 (room before overbought), price above 20/50 MA, ' +
    'MACD positive crossover. ETH RSI 55. BTC RSI 47 (below MAs).',
  trace: {
    role: 'subagent.indicators',
    summary: 'Computed RSI / moving averages / MACD from OHLC.',
    steps: [
      { label: 'Momentum', detail: 'WMNT RSI 61, MACD positive crossover.' },
      { label: 'Structure', detail: 'WMNT above 20 & 50 MA; BTC below.' },
    ],
  },
});

const REGISTRY: Record<string, Subagent> = {
  'subagent.onchain': onchain,
  'subagent.market': market,
  'subagent.news': news,
  'subagent.indicators': indicators,
};

/** Run only the active subagents (default: all). Returns combined context + traces. */
export async function runSubagents(
  intent: string,
  activeSources?: AIRole[],
): Promise<{ context: string; traces: ReasoningTrace[]; used: AIRole[] }> {
  const active = (activeSources?.length ? activeSources : [...SUBAGENT_ROLES]).filter(
    (r): r is AIRole => r in REGISTRY,
  );
  const results = await Promise.all(active.map((r) => REGISTRY[r]!(intent)));
  return {
    context: results.map((r) => r.context).join('\n'),
    traces: results.map((r) => r.trace),
    used: active,
  };
}
