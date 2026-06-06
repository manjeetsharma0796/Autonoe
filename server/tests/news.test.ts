import { test, expect } from 'bun:test';
import { searchNews, type NewsFetcher } from '../src/market/news.ts';
import { makeRecorder, makeTools } from '../src/agents/tools.ts';
import type { Fetcher } from '../src/market/bybit.ts';

// ── searchNews unit tests ────────────────────────────────────────────────────

const fakeTavilyPayload = {
  results: [
    {
      title: 'Mantle Network Reaches New Milestone',
      url: 'https://decrypt.co/mantle-milestone',
      content: 'Mantle Network announced a significant growth in TVL this week.',
      published_date: '2026-06-05',
    },
    {
      title: 'Bitcoin ETF Sees Record Inflows',
      url: 'https://coindesk.com/bitcoin-etf',
      content: 'Spot Bitcoin ETFs recorded their highest single-day inflows.',
    },
  ],
};

const fakeTavilyFetcher: NewsFetcher = async (_url, _init) => ({
  ok: true,
  status: 200,
  json: async () => fakeTavilyPayload,
});

test('searchNews parses Tavily results into NewsItem[]', async () => {
  const result = await searchNews('Mantle network', {
    fetcher: fakeTavilyFetcher,
    apiKey: 'test-key',
  });
  expect(result.configured).toBe(true);
  expect(result.items).toHaveLength(2);

  const first = result.items[0]!;
  expect(first.title).toBe('Mantle Network Reaches New Milestone');
  expect(first.url).toBe('https://decrypt.co/mantle-milestone');
  expect(first.snippet).toBe('Mantle Network announced a significant growth in TVL this week.');
  expect(first.published).toBe('2026-06-05');

  const second = result.items[1]!;
  expect(second.title).toBe('Bitcoin ETF Sees Record Inflows');
  // published_date absent → no published field
  expect(second.published).toBeUndefined();
});

test('searchNews with no API key returns { configured: false, items: [] } without calling fetcher', async () => {
  let fetcherCalled = false;
  const trackingFetcher: NewsFetcher = async () => {
    fetcherCalled = true;
    return { ok: true, status: 200, json: async () => ({}) };
  };

  const result = await searchNews('Bitcoin', { fetcher: trackingFetcher, apiKey: '' });
  expect(result.configured).toBe(false);
  expect(result.items).toHaveLength(0);
  expect(fetcherCalled).toBe(false);
});

test('searchNews throws a clear Error on non-ok HTTP response', async () => {
  const errorFetcher: NewsFetcher = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: 'Unauthorized' }),
  });

  await expect(
    searchNews('test query', { fetcher: errorFetcher, apiKey: 'bad-key' }),
  ).rejects.toThrow('Tavily search failed: HTTP 401');
});

// ── makeTools integration tests ──────────────────────────────────────────────

// Minimal bybit fetcher (needed when market tools are in the active list).
const fakeBybitFetch: Fetcher = async (url) => ({
  ok: true,
  status: 200,
  json: async () =>
    url.includes('kline')
      ? { result: { list: Array.from({ length: 30 }, (_, i) => [String(29 - i), '100', '110', '90', String(100 + (29 - i)), '5', '0']) } }
      : { result: { list: [{ lastPrice: '1.2843', price24hPcnt: '0.0421', volume24h: '1000' }] } },
});

test('search_news is present in byName when subagent.news is active', () => {
  const rec = makeRecorder();
  const { byName } = makeTools(rec, ['subagent.news'], fakeBybitFetch, { fetcher: fakeTavilyFetcher, apiKey: 'test-key' });
  expect(byName.has('search_news')).toBe(true);
});

test('search_news is absent from byName when subagent.news is not in active list', () => {
  const rec = makeRecorder();
  const { byName } = makeTools(rec, ['subagent.market'], fakeBybitFetch);
  expect(byName.has('search_news')).toBe(false);
});

test('invoking search_news records a subagent.news trace', async () => {
  const rec = makeRecorder();
  const { byName } = makeTools(rec, ['subagent.news'], fakeBybitFetch, {
    fetcher: fakeTavilyFetcher,
    apiKey: 'test-key',
  });

  const tool = byName.get('search_news')!;
  expect(tool).toBeDefined();
  const out = String(await tool.invoke({ query: 'Mantle network' }));
  expect(out).toContain('Mantle Network Reaches New Milestone');

  const traces = rec.traces();
  expect(traces).toHaveLength(1);
  expect(traces[0]!.role).toBe('subagent.news');
  expect(traces[0]!.steps[0]!.label).toBe('news:Mantle network');
});

test('invoking search_news with no API key records a "not configured" trace and does not throw', async () => {
  const rec = makeRecorder();
  const { byName } = makeTools(rec, ['subagent.news'], fakeBybitFetch, { apiKey: '' });

  const tool = byName.get('search_news')!;
  const out = String(await tool.invoke({ query: 'Bitcoin' }));
  expect(out).toContain('not configured');

  const traces = rec.traces();
  expect(traces).toHaveLength(1);
  expect(traces[0]!.role).toBe('subagent.news');
  expect(traces[0]!.steps[0]!.detail).toBe('news source not configured');
});
