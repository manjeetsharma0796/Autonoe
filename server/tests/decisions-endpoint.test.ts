// Integration test for the POST /api/decisions endpoint (T-603).
// Boots the Express app with a fake on-chain reader (no RPC needed),
// posts off-chain metadata for a known thesisHash, then verifies that
// GET /api/history returns the merged record with the stored metadata.

import { test, expect, afterAll } from 'bun:test';
import type { Server } from 'http';

process.env.AUTONOE_DB = ':memory:';
process.env.AUTONOE_SECRET = 'test-secret-endpoint';

// Known thesisHash that the fake on-chain reader will return.
const THESIS_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
const TX_HASH = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
const WALLET_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

const { createApp } = await import('../src/app.ts');
const { API } = await import('@autonoe/shared');

// Fake on-chain reader returns one decision whose thesisHash matches THESIS_HASH.
const fakeReadHistory = async (_address: string) => [
  {
    thesisHash: THESIS_HASH,
    optionRef: 'opt-A',
    pnl: 0n,
    timestamp: 1_700_000_000n,
  },
];

const app = createApp({ readHistory: fakeReadHistory });

// Start the server on an OS-assigned free port.
const server: Server = await new Promise((resolve) => {
  const s = app.listen(0, () => resolve(s));
});
const port = (server.address() as { port: number }).port;
const base = `http://localhost:${port}`;

afterAll(() => {
  server.close();
});

// ── helpers ───────────────────────────────────────────────────────────────────

async function postDecision(body: Record<string, unknown>) {
  return fetch(`${base}${API.decisions}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ── tests ─────────────────────────────────────────────────────────────────────

test('POST /api/decisions accepts a valid payload and returns {ok:true}', async () => {
  const res = await postDecision({
    thesisHash: THESIS_HASH,
    thesisId: 'thesis-001',
    source: 'ai',
    judged: true,
    chosenOptionRef: 'opt-A',
    txHash: TX_HASH,
    pnlMUSD: 0,
    modelsUsed: { thesis: { provider: 'groq', model: 'llama3-8b' } },
    createdAt: '2026-06-06T12:00:00.000Z',
  });
  expect(res.status).toBe(200);
  const body = (await res.json()) as { ok: boolean };
  expect(body.ok).toBe(true);
});

test('GET /api/history returns the stored metadata merged with on-chain data', async () => {
  const res = await fetch(`${base}${API.history}?address=${WALLET_ADDRESS}`);
  expect(res.status).toBe(200);
  const records = (await res.json()) as Array<{
    thesisId: string;
    source: string;
    judged: boolean;
    txHash: string | null;
    modelsUsed: Record<string, unknown>;
  }>;
  expect(records).toHaveLength(1);
  const rec = records[0]!;
  // Metadata fields from the POST should be present (not the on-chain fallbacks).
  expect(rec.thesisId).toBe('thesis-001');
  expect(rec.source).toBe('ai');
  expect(rec.judged).toBe(true);
  expect(rec.txHash).toBe(TX_HASH);
  expect(rec.modelsUsed).toMatchObject({ thesis: { provider: 'groq', model: 'llama3-8b' } });
});

test('POST /api/decisions rejects a missing/invalid thesisHash with 400', async () => {
  const res = await postDecision({ thesisHash: 'not-a-hash', thesisId: 'x' });
  expect(res.status).toBe(400);
  const body = (await res.json()) as { error: string };
  expect(body.error).toMatch(/thesisHash/);
});

test('POST /api/decisions rejects a too-short hex thesisHash with 400', async () => {
  const res = await postDecision({ thesisHash: '0xdeadbeef' });
  expect(res.status).toBe(400);
});

test('POST /api/decisions coerces missing optional fields to defaults', async () => {
  const hash = '0x' + 'aa'.repeat(32);
  const res = await postDecision({ thesisHash: hash });
  expect(res.status).toBe(200);
  const body = (await res.json()) as { ok: boolean };
  expect(body.ok).toBe(true);
});
