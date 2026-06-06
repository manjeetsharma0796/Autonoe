import { test, expect } from 'bun:test';
import { buildHistory, buildLeaderboard, type OnchainDecision } from '../src/decisions.ts';
import type { StoredDecision } from '../src/store.ts';

const meta = (over: Partial<StoredDecision>): StoredDecision => ({
  thesisHash: '0xabc',
  thesisId: 'th-1',
  source: 'ai',
  judged: true,
  chosenOptionRef: 'opt-2',
  txHash: '0xdead',
  pnlMUSD: 12.5,
  modelsUsed: { thesis: { provider: 'groq', model: 'llama' } },
  createdAt: '2026-06-06T00:00:00.000Z',
  ...over,
});

test('buildHistory merges on-chain decisions with stored metadata', () => {
  const onchain: OnchainDecision[] = [
    { thesisHash: '0xABC', optionRef: 'opt-2', pnl: 12_500_000n, timestamp: 1_700_000_000n },
  ];
  const rows = buildHistory(onchain, new Map([['0xabc', meta({})]]));
  expect(rows).toHaveLength(1);
  expect(rows[0]!.thesisId).toBe('th-1'); // from metadata (case-insensitive hash)
  expect(rows[0]!.txHash).toBe('0xdead');
  expect(rows[0]!.pnlMUSD).toBe(12.5);
});

test('buildHistory falls back to on-chain data when no metadata exists', () => {
  const onchain: OnchainDecision[] = [
    { thesisHash: '0xfeed', optionRef: 'opt-9', pnl: -2_000_000n, timestamp: 1_700_000_000n },
  ];
  const rows = buildHistory(onchain, new Map());
  expect(rows[0]!.thesisId).toBe('0xfeed');
  expect(rows[0]!.source).toBe('ai');
  expect(rows[0]!.chosenOptionRef).toBe('opt-9');
  expect(rows[0]!.txHash).toBeNull();
  expect(rows[0]!.pnlMUSD).toBe(-2); // -2_000_000 base units / 1e6
});

test('buildLeaderboard aggregates win rate + avg PnL by role/model', () => {
  const decisions: StoredDecision[] = [
    meta({ thesisHash: '0x1', pnlMUSD: 10, modelsUsed: { thesis: { provider: 'groq', model: 'llama' } } }),
    meta({ thesisHash: '0x2', pnlMUSD: -4, modelsUsed: { thesis: { provider: 'groq', model: 'llama' } } }),
    meta({ thesisHash: '0x3', pnlMUSD: 6, modelsUsed: { judge: { provider: 'mistral', model: 'large' } } }),
  ];
  const rows = buildLeaderboard(decisions);
  const llama = rows.find((r) => r.model === 'llama')!;
  expect(llama.trades).toBe(2);
  expect(llama.winRate).toBe(0.5);
  expect(llama.avgPnlMUSD).toBe(3); // (10 + -4) / 2
  // sorted by avgPnlMUSD desc: mistral/large (6) ranks above groq/llama (3)
  expect(rows[0]!.model).toBe('large');
});

test('buildLeaderboard is empty with no decisions', () => {
  expect(buildLeaderboard([])).toEqual([]);
});
