// Express app — implements the REST contract in @autonoe/shared (PRD §12).
// History/leaderboard return empty until the chain lib (T-108) lands in T-207.

import express, { type Request, type Response, type NextFunction } from 'express';
import { API, type ProviderId, type RoleModelMap } from '@autonoe/shared';
import { listProviders, listModels } from './providers.ts';
import { setProviderKey } from './store.ts';
import { getRoleMap, setRoleMap } from './roles.ts';
import { generateThesis, structureHumanThesis } from './agents/thesis.ts';
import { runDebate } from './agents/debate.ts';
import { chat } from './agents/assistant.ts';
import { fetchCandles } from './market/candles.ts';
import { allDecisions, recordDecision, type StoredDecision } from './store.ts';
import { buildHistory, buildLeaderboard, type OnchainDecision } from './decisions.ts';

type Handler = (req: Request, res: Response) => Promise<void> | void;
const wrap = (h: Handler) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(h(req, res)).catch(next);

export interface AppDeps {
  /** On-chain DecisionLog reader; defaults to the chain lib (lazily imported so
   *  importing the app doesn't pull viem/RPC into offline tests). */
  readHistory?: (address: string) => Promise<OnchainDecision[]>;
}

const defaultReadHistory = async (address: string): Promise<OnchainDecision[]> => {
  const { readHistory } = await import('@autonoe/chain');
  const records = await readHistory(address as `0x${string}`);
  return records.map((d) => ({
    thesisHash: d.thesisHash,
    optionRef: d.optionRef,
    pnl: d.pnl,
    timestamp: d.timestamp,
  }));
};

export function createApp(deps: AppDeps = {}) {
  const readHistory = deps.readHistory ?? defaultReadHistory;
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.get(API.providers, (_req, res) => res.json(listProviders()));

  app.post(
    API.keys,
    wrap((req, res) => {
      const { provider, apiKey } = req.body ?? {};
      if (!provider || !apiKey) throw httpError(400, 'provider and apiKey required');
      setProviderKey(provider as ProviderId, String(apiKey));
      res.json({ ok: true });
    }),
  );

  app.get(
    API.models,
    wrap(async (req, res) => {
      const provider = req.query.provider as ProviderId | undefined;
      if (!provider) throw httpError(400, 'provider query param required');
      res.json(await listModels(provider));
    }),
  );

  app.get(API.roles, (_req, res) => res.json(getRoleMap()));
  app.put(
    API.roles,
    wrap((req, res) => {
      setRoleMap(req.body as RoleModelMap);
      res.json(getRoleMap());
    }),
  );

  app.post(
    API.thesis,
    wrap(async (req, res) => {
      const { intent, activeSources } = req.body ?? {};
      if (!intent) throw httpError(400, 'intent required');
      res.json(await generateThesis({ intent: String(intent), activeSources }));
    }),
  );

  app.post(
    API.thesisHuman,
    wrap(async (req, res) => {
      const { intent, body, suggestedPair } = req.body ?? {};
      if (!intent || !body || !suggestedPair) throw httpError(400, 'intent, body, suggestedPair required');
      res.json(await structureHumanThesis({ intent, body, suggestedPair }));
    }),
  );

  app.post(
    API.debate,
    wrap(async (req, res) => {
      const { thesis } = req.body ?? {};
      if (!thesis?.id) throw httpError(400, 'thesis required');
      res.json(await runDebate(thesis));
    }),
  );

  app.post(
    API.assistant,
    wrap(async (req, res) => {
      const { messages, context } = req.body ?? {};
      if (!Array.isArray(messages)) throw httpError(400, 'messages[] required');
      res.json(await chat({ messages, context }));
    }),
  );

  // Real OHLCV bars (Bybit spot via the market layer) so the UI never calls
  // Bybit directly — feeds the interactive prediction chart (T-415).
  app.get(
    API.candles,
    wrap(async (req, res) => {
      res.json(await fetchCandles(req.query));
    }),
  );

  // /api/history?address= — merge the on-chain DecisionLog for that wallet with
  // our stored off-chain metadata (model attribution, source, tx hash). T-207.
  app.get(
    API.history,
    wrap(async (req, res) => {
      const address = typeof req.query.address === 'string' ? req.query.address : '';
      if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
        res.json([]);
        return;
      }
      const onchain = await readHistory(address);
      const metaByHash = new Map(allDecisions().map((d) => [d.thesisHash.toLowerCase(), d]));
      res.json(buildHistory(onchain, metaByHash));
    }),
  );

  // /api/leaderboard — realized outcomes aggregated by model + role. T-207.
  app.get(API.leaderboard, (_req, res) => res.json(buildLeaderboard(allDecisions())));

  // /api/decisions — record an executed decision's off-chain metadata. T-603.
  app.post(
    API.decisions,
    wrap((req, res) => {
      const body = req.body ?? {};
      const { thesisHash } = body as { thesisHash?: unknown };
      if (typeof thesisHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(thesisHash)) {
        throw httpError(400, 'thesisHash must be a 0x-prefixed 32-byte hex string');
      }
      const raw = body as Record<string, unknown>;
      const source = raw['source'] === 'human' ? 'human' : 'ai';
      const stored: StoredDecision = {
        thesisHash,
        thesisId: typeof raw['thesisId'] === 'string' ? raw['thesisId'] : thesisHash,
        source,
        judged: Boolean(raw['judged']),
        chosenOptionRef: typeof raw['chosenOptionRef'] === 'string' ? raw['chosenOptionRef'] : '',
        txHash: typeof raw['txHash'] === 'string' ? raw['txHash'] : null,
        pnlMUSD: typeof raw['pnlMUSD'] === 'number' && isFinite(raw['pnlMUSD']) ? raw['pnlMUSD'] : 0,
        modelsUsed: (raw['modelsUsed'] != null && typeof raw['modelsUsed'] === 'object') ? raw['modelsUsed'] as StoredDecision['modelsUsed'] : {},
        createdAt: typeof raw['createdAt'] === 'string' ? raw['createdAt'] : new Date().toISOString(),
      };
      recordDecision(stored);
      res.json({ ok: true });
    }),
  );

  // error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = (err as { status?: number }).status ?? 500;
    const message = (err as Error).message ?? 'internal error';
    if (status >= 500) console.error(err);
    res.status(status).json({ error: message });
  });

  return app;
}

function httpError(status: number, message: string): Error {
  return Object.assign(new Error(message), { status });
}
