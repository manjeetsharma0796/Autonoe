// T-207 - Backs /api/history and /api/leaderboard with real data by joining
// on-chain DecisionLog records with off-chain TradeMeta from SQLite.

import { getPublicClient, isDeployed, readHistory } from '@autonoe/chain';
import type { AIRole, ProviderId } from '@autonoe/shared';
import type { HistoryRecord, LeaderboardRow } from '@autonoe/shared';
import { listTrades } from './store.ts';

/**
 * Return all decisions from the on-chain DecisionLog, enriched with
 * off-chain trade metadata. Returns [] if contracts are not yet deployed.
 */
export async function getHistory(): Promise<HistoryRecord[]> {
  if (!isDeployed()) return [];

  const client = getPublicClient();
  const decisions = await readHistory(client);

  // Build a lookup map: lowercase thesisHash → TradeMeta
  const trades = listTrades();
  const metaByHash = new Map(
    trades.map((t) => [t.thesisHash.toLowerCase(), t]),
  );

  const records: HistoryRecord[] = decisions.map((d) => {
    const meta = metaByHash.get(d.thesisHash.toLowerCase());
    return {
      thesisId: meta?.thesisId ?? d.thesisHash,
      source: meta?.source ?? 'ai',
      judged: meta?.judged ?? false,
      chosenOptionRef: meta?.chosenOptionRef ?? d.optionRef,
      txHash: null,
      pnlMUSD: Number(d.pnl) / 1e6,
      modelsUsed: meta?.modelsUsed ?? {},
      createdAt: new Date(d.timestamp * 1000).toISOString(),
    };
  });

  // Sort newest-first
  records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return records;
}

/**
 * Aggregate per-(role, provider, model) statistics across all history records
 * that carry modelsUsed attribution. Returns [] if nothing to aggregate.
 * Sorted by avgPnlMUSD descending.
 */
export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const history = await getHistory();

  interface Accumulator {
    trades: number;
    wins: number;
    sumPnl: number;
  }

  // Composite key: `${role}|${provider}|${model}`
  const acc = new Map<string, Accumulator>();

  for (const record of history) {
    if (!record.modelsUsed || Object.keys(record.modelsUsed).length === 0) continue;
    const pnl = record.pnlMUSD ?? 0;

    for (const [role, choice] of Object.entries(record.modelsUsed) as [
      AIRole,
      { provider: ProviderId; model: string },
    ][]) {
      if (!choice) continue;
      const key = `${role}|${choice.provider}|${choice.model}`;
      const entry = acc.get(key) ?? { trades: 0, wins: 0, sumPnl: 0 };
      entry.trades += 1;
      if (pnl > 0) entry.wins += 1;
      entry.sumPnl += pnl;
      acc.set(key, entry);
    }
  }

  if (acc.size === 0) return [];

  const rows: LeaderboardRow[] = [];
  for (const [key, { trades, wins, sumPnl }] of acc) {
    const [role, provider, model] = key.split('|') as [AIRole, ProviderId, string];
    rows.push({
      role,
      provider,
      model,
      trades,
      winRate: wins / trades,
      avgPnlMUSD: sumPnl / trades,
    });
  }

  rows.sort((a, b) => b.avgPnlMUSD - a.avgPnlMUSD);
  return rows;
}
