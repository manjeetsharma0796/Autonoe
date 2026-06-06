// LangChain tools the thesis agent can call on demand (intent-driven). Each tool
// fetches real data and records a reasoning-trace entry. The active data-source
// toggles act as an allow-list of which tools the model may use.
// News/sentiment is provided by the search_news tool (subagent.news, T-209)
// via Tavily; degrades gracefully when TAVILY_API_KEY is unset.

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { AIRole, AssetSymbol, ReasoningTrace } from '@autonoe/shared';
import { getKline, getTicker, closes, type Fetcher } from '../market/bybit.ts';
import { snapshot } from '../market/indicators.ts';
import { searchNews, type NewsFetcher } from '../market/news.ts';

const Asset = z.object({ asset: z.enum(['WMNT', 'MockBTC', 'MockETH']) });

export interface TraceRecorder {
  add(role: AIRole, name: string, summary: string, detail: string): void;
  traces(): ReasoningTrace[];
}

export function makeRecorder(): TraceRecorder {
  const byRole = new Map<AIRole, ReasoningTrace>();
  return {
    add(role, name, summary, detail) {
      const t = byRole.get(role) ?? { role, summary, steps: [] };
      t.steps.push({ label: name, detail });
      byRole.set(role, t);
    },
    traces: () => [...byRole.values()],
  };
}

/** Build the toolset, filtered to the active data sources. */
export function makeTools(
  rec: TraceRecorder,
  active: AIRole[],
  f?: Fetcher,
  newsDeps?: { fetcher?: NewsFetcher; apiKey?: string },
) {
  const allow = new Set(active);

  const tickerTool = tool(
    async ({ asset }: { asset: AssetSymbol }) => {
      const t = await getTicker(asset, f);
      const detail = `price ${t.price}, 24h ${t.change24hPct.toFixed(2)}%, vol ${t.volume24h}`;
      rec.add('subagent.market', `ticker:${asset}`, 'Live price from Bybit', detail);
      return `${asset} ${detail}`;
    },
    { name: 'get_ticker', description: 'Live spot price + 24h change/volume for an asset (Bybit).', schema: Asset },
  );

  const candlesTool = tool(
    async ({ asset }: { asset: AssetSymbol }) => {
      const candles = await getKline(asset, '60', 100, f);
      const cs = closes(candles);
      const first = cs[0] ?? 0;
      const last = cs.at(-1) ?? 0;
      const pct = first ? ((last - first) / first) * 100 : 0;
      const lo = Math.min(...cs);
      const hi = Math.max(...cs);
      const detail = `100x1h: last ${last}, window ${pct.toFixed(1)}%, range ${lo}–${hi}`;
      rec.add('subagent.market', `candles:${asset}`, 'Fetched 1h candles from Bybit', detail);
      return `${asset} ${detail}`;
    },
    { name: 'get_candles', description: 'Recent 1h OHLC summary for an asset (Bybit).', schema: Asset },
  );

  const indicatorsTool = tool(
    async ({ asset }: { asset: AssetSymbol }) => {
      const candles = await getKline(asset, '60', 100, f);
      const s = snapshot(closes(candles));
      const detail =
        `RSI14 ${s.rsi14}, SMA20 ${s.sma20?.toFixed(4)}, SMA50 ${s.sma50?.toFixed(4)}, ` +
        `aboveSMA20 ${s.aboveSma20}, MACD hist ${s.macd?.hist}`;
      rec.add('subagent.indicators', `indicators:${asset}`, 'Computed RSI/MA/MACD from real candles', detail);
      return `${asset} ${detail}`;
    },
    { name: 'get_indicators', description: 'RSI, SMA20/50, MACD computed from real candles.', schema: Asset },
  );

  const onchainTool = tool(
    async () => {
      // Mock until the chain lib (T-108) exposes AMM reserves on Mantle Sepolia.
      const detail = 'mUSD/WMNT mid 1.2843, depth ~42k mUSD, 24h vol +18% (AMM, placeholder)';
      rec.add('subagent.onchain', 'onchain:amm', 'Read on-chain AMM state (placeholder)', detail);
      return detail;
    },
    { name: 'get_onchain_market', description: 'On-chain AMM price/liquidity for mUSD pairs (Mantle).', schema: z.object({}) },
  );

  const newsTool = tool(
    async ({ query }: { query: string }) => {
      const result = await searchNews(query, {
        fetcher: newsDeps?.fetcher,
        apiKey: newsDeps?.apiKey,
      });
      if (!result.configured) {
        rec.add(
          'subagent.news',
          `news:${query}`,
          'Web search unavailable (no TAVILY_API_KEY)',
          'news source not configured',
        );
        return 'News search is not configured (TAVILY_API_KEY not set).';
      }
      if (result.items.length === 0) {
        rec.add('subagent.news', `news:${query}`, 'No recent headlines found', 'no results returned by Tavily');
        return 'No recent headlines found for this query.';
      }
      const detail = result.items
        .map((item) => {
          const host = (() => { try { return new URL(item.url).hostname; } catch { return item.url; } })();
          return `${item.title} — ${host}`;
        })
        .join('\n');
      rec.add('subagent.news', `news:${query}`, 'Searched recent news (Tavily)', detail);
      return detail;
    },
    {
      name: 'search_news',
      description: 'Recent news headlines + sentiment for a topic/asset via web search.',
      schema: z.object({
        query: z.string().describe('news search query, e.g. "Mantle network" or "Bitcoin ETF approval"'),
      }),
    },
  );

  const all = [
    { roles: ['subagent.market'], t: tickerTool },
    { roles: ['subagent.market'], t: candlesTool },
    { roles: ['subagent.indicators'], t: indicatorsTool },
    { roles: ['subagent.onchain'], t: onchainTool },
    { roles: ['subagent.news'], t: newsTool },
  ];

  const tools = all.filter((e) => e.roles.some((r) => allow.has(r as AIRole))).map((e) => e.t);
  type Invokable = { invoke: (arg: Record<string, unknown>) => Promise<unknown> };
  const byName = new Map<string, Invokable>(
    tools.map((t) => [t.name, t as unknown as Invokable] as const),
  );
  return { tools, byName };
}
