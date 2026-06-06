// Pure builders for the history + leaderboard endpoints (T-207). Kept free of
// SQLite and viem so they unit-test with plain fixtures; the app glues them to
// `store.allDecisions()` and the chain lib's `readHistory()`.

import type { HistoryRecord, LeaderboardRow, AIRole, ProviderId } from '@autonoe/shared';
import type { StoredDecision } from './store.ts';

/** The subset of an on-chain DecisionLog record this layer needs. */
export interface OnchainDecision {
  thesisHash: string;
  optionRef: string;
  /** signed, mUSD base units (6 decimals). */
  pnl: bigint;
  /** seconds since epoch. */
  timestamp: bigint;
}

const MUSD_DECIMALS = 1_000_000; // 6

/**
 * Merge the authoritative on-chain decisions with whatever off-chain metadata
 * we stored at execution time (model attribution, source, thesis id, tx hash).
 * On-chain order is oldest→newest.
 */
export function buildHistory(
  onchain: OnchainDecision[],
  metaByHash: Map<string, StoredDecision>,
): HistoryRecord[] {
  return onchain.map((d) => {
    const meta = metaByHash.get(d.thesisHash.toLowerCase());
    return {
      thesisId: meta?.thesisId ?? d.thesisHash,
      source: meta?.source ?? 'ai',
      judged: meta?.judged ?? false,
      chosenOptionRef: meta?.chosenOptionRef ?? d.optionRef,
      txHash: (meta?.txHash ?? null) as `0x${string}` | null,
      pnlMUSD: meta?.pnlMUSD ?? Number(d.pnl) / MUSD_DECIMALS,
      modelsUsed: meta?.modelsUsed ?? {},
      createdAt: meta?.createdAt ?? new Date(Number(d.timestamp) * 1000).toISOString(),
    };
  });
}

/**
 * Aggregate realized outcomes by (role, provider, model) across stored
 * decisions. Each decision attributes its PnL + win/loss to every role→model
 * that produced it. Sorted by average PnL, then trade count.
 */
export function buildLeaderboard(decisions: StoredDecision[]): LeaderboardRow[] {
  interface Agg {
    role: AIRole;
    provider: ProviderId;
    model: string;
    trades: number;
    wins: number;
    pnlSum: number;
  }
  const byKey = new Map<string, Agg>();

  for (const d of decisions) {
    for (const [role, choice] of Object.entries(d.modelsUsed)) {
      if (!choice) continue;
      const key = `${role}|${choice.provider}|${choice.model}`;
      const agg =
        byKey.get(key) ??
        {
          role: role as AIRole,
          provider: choice.provider,
          model: choice.model,
          trades: 0,
          wins: 0,
          pnlSum: 0,
        };
      agg.trades += 1;
      if (d.pnlMUSD > 0) agg.wins += 1;
      agg.pnlSum += d.pnlMUSD;
      byKey.set(key, agg);
    }
  }

  return [...byKey.values()]
    .map((a) => ({
      role: a.role,
      provider: a.provider,
      model: a.model,
      trades: a.trades,
      winRate: a.trades ? a.wins / a.trades : 0,
      avgPnlMUSD: a.trades ? a.pnlSum / a.trades : 0,
    }))
    .sort((x, y) => y.avgPnlMUSD - x.avgPnlMUSD || y.trades - x.trades);
}
