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
import { signPrice } from './oracle.ts';
import { getHistory, getLeaderboard } from './history.ts';
import { getCandlesFor } from './candles.ts';

type Handler = (req: Request, res: Response) => Promise<void> | void;
const wrap = (h: Handler) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(h(req, res)).catch(next);

export function createApp() {
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

  // Signed-pull price oracle (T-210): live price + signature for SyntheticExchange.
  app.get(
    '/api/price/sign',
    wrap(async (req, res) => {
      const symbol = req.query.symbol;
      if (!symbol || typeof symbol !== 'string') throw httpError(400, 'symbol query param required');
      res.json(await signPrice(symbol));
    }),
  );

  // T-415: OHLCV candles for the prediction chart.
  app.get(
    '/api/candles',
    wrap(async (req, res) => {
      const symbol = req.query.symbol;
      if (!symbol || typeof symbol !== 'string') throw httpError(400, 'symbol query param required');
      const interval = typeof req.query.interval === 'string' ? req.query.interval : '60';
      const rawLimit = parseInt(String(req.query.limit ?? '100'), 10);
      const limit = Math.min(isNaN(rawLimit) ? 100 : rawLimit, 200);
      res.json(await getCandlesFor(symbol, interval, limit));
    }),
  );

  // T-207: backed by on-chain DecisionLog + off-chain TradeMeta store.
  app.get(API.history, wrap(async (_req, res) => { res.json(await getHistory()); }));
  app.get(API.leaderboard, wrap(async (_req, res) => { res.json(await getLeaderboard()); }));

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
