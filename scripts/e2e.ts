// T-604 — end-to-end happy path: intent → thesis → debate → swap → on-chain log.
//
// Drives the REAL integration surface: boots the bun server in-process (createApp),
// configures a live AI provider, generates a thesis + runs the debate over HTTP,
// then executes the chosen option on Mantle Sepolia via @autonoe/wallet (real swap
// + DecisionLog write) and confirms /api/history surfaces the on-chain record.
//
// Gated on secrets so CI (which has none) skips it cleanly:
//   MISTRAL_API_KEY      — the AI provider for thesis/debate
//   DEPLOYER_PRIVATE_KEY — a funded Mantle Sepolia agent wallet (gas + mUSD)
// Run:  bun run e2e   (from repo root, with those in .env / the environment)

import { createApp } from '../server/src/app.ts';
import {
  executeOption,
  claimMusdFaucet,
  musdBalance,
  type ExecuteOptionResult,
} from '../packages/wallet/src/index.ts';
import { privateKeyToAccount } from 'viem/accounts';
import { keccak256, toHex, type Hex } from 'viem';
import type { AddressInfo } from 'node:net';

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY ?? '';
const RAW_PK = process.env.DEPLOYER_PRIVATE_KEY ?? '';

if (!MISTRAL_API_KEY || !RAW_PK) {
  console.log('SKIP e2e — needs MISTRAL_API_KEY + DEPLOYER_PRIVATE_KEY (none in this env).');
  process.exit(0);
}

const PK = (RAW_PK.startsWith('0x') ? RAW_PK : `0x${RAW_PK}`) as Hex;
const AGENT = privateKeyToAccount(PK).address;

// Boot the app in-process on an ephemeral port.
process.env.AUTONOE_SECRET ??= 'e2e-secret';
const app = createApp();
const server = await new Promise<import('node:http').Server>((resolve) => {
  const s = app.listen(0, () => resolve(s));
});
const port = (server.address() as AddressInfo).port;
const base = `http://localhost:${port}`;
console.log(`server up on ${base}`);

async function api(path: string, init?: RequestInit) {
  const res = await fetch(base + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  let json: unknown;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${text}`);
  return json as any;
}

function step(n: number, msg: string) { console.log(`\n[${n}] ${msg}`); }

try {
  // 1. Configure the AI provider (key stored encrypted at rest).
  step(1, 'POST /api/keys — store the Mistral provider key');
  await api('/api/keys', { method: 'POST', body: JSON.stringify({ provider: 'mistral', apiKey: MISTRAL_API_KEY }) });

  // 2. Discover a real Mistral model id and assign every role to it.
  step(2, 'GET /api/models?provider=mistral — pick a model');
  const models = await api('/api/models?provider=mistral');
  const ids: string[] = (Array.isArray(models) ? models : models.models ?? []).map((m: any) => m.id ?? m).filter(Boolean);
  const model = ids.find((id) => /small/i.test(id)) ?? ids.find((id) => /ministral/i.test(id)) ?? ids[0];
  if (!model) throw new Error('no Mistral models returned');
  console.log('   using model:', model);

  step(2, 'PUT /api/roles — map all roles → mistral');
  const roles = await api('/api/roles');
  const choice = { provider: 'mistral', model };
  const roleMap = Object.fromEntries(Object.keys(roles).map((r) => [r, choice]));
  await api('/api/roles', { method: 'PUT', body: JSON.stringify(roleMap) });

  // 3. intent → thesis
  step(3, 'POST /api/thesis — generate a thesis');
  const intent = 'Take a measured long on WMNT if momentum and indicators support it; small size.';
  const thesis = await api('/api/thesis', {
    method: 'POST',
    body: JSON.stringify({ intent, activeSources: ['subagent.market', 'subagent.indicators'] }),
  });
  console.log(`   thesis ${thesis.id}: ${thesis.options.length} options, pair ${thesis.suggestedPair}`);

  // 4. thesis → debate
  step(4, 'POST /api/debate — run the tribunal');
  const debate = await api('/api/debate', { method: 'POST', body: JSON.stringify({ thesis }) });
  console.log(`   verdict: ${String(debate.judgeSummary).slice(0, 120)}…`);
  console.log(`   refined options: ${debate.refinedOptions.length}`);

  // 5. choose the highest-confidence refined option, resolve the underlying ThesisOption
  const best = [...debate.refinedOptions].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];
  const chosen = thesis.options.find((o: any) => o.id === best.optionRef) ?? thesis.options[0];
  // Keep the live swap small + within policy/faucet limits.
  const option = { id: chosen.id, direction: chosen.direction, asset: chosen.asset, sizeMUSD: 50 };
  console.log(`   chosen: ${option.direction} ${option.asset} (ref ${best.optionRef}, conf ${best.confidence})`);

  // 6. ensure mUSD, then execute the real swap + DecisionLog write
  step(6, 'executeOption — real swap + DecisionLog on Mantle Sepolia');
  let bal = await musdBalance(AGENT as `0x${string}`);
  if (bal < BigInt(option.sizeMUSD) * 1_000_000n) {
    console.log('   low mUSD — claiming faucet…');
    try { const f = await claimMusdFaucet(PK); console.log('   faucet tx:', f.explorerUrl); } catch (e) { console.log('   faucet skipped:', (e as Error).message); }
    bal = await musdBalance(AGENT as `0x${string}`);
  }
  const thesisHash = keccak256(toHex(JSON.stringify({ id: thesis.id, intent: thesis.intent })));
  const verdictHash = keccak256(toHex(JSON.stringify({ thesisId: thesis.id, summary: debate.judgeSummary })));
  const result: ExecuteOptionResult = await executeOption({
    privateKey: PK,
    option,
    thesisHash,
    verdictHash,
    optionRef: best.optionRef,
    confirmed: true,
    policy: { maxTradeMUSD: 1000, allowedTokens: ['WMNT', 'MockBTC', 'MockETH'] },
    slippageBps: 100,
  });
  console.log('   swap tx    :', result.swap.explorerUrl);
  console.log('   amountIn/out:', result.swap.amountIn, '→', result.swap.amountOut);
  console.log('   decision tx:', result.decisionTxHash);

  // 7. record off-chain metadata, then read the merged history
  step(7, 'POST /api/decisions + GET /api/history — confirm the on-chain record surfaces');
  await api('/api/decisions', {
    method: 'POST',
    body: JSON.stringify({
      thesisHash, thesisId: thesis.id, source: thesis.source, judged: true,
      chosenOptionRef: best.optionRef, txHash: result.swap.txHash, pnlMUSD: 0,
      modelsUsed: thesis.modelsUsed ?? { thesis: choice }, createdAt: new Date().toISOString(),
    }),
  });
  // Public RPC reads are load-balanced; a just-confirmed log can lag on a replica.
  // Poll /api/history until the new on-chain record propagates.
  let history: any[] = [];
  let found = false;
  for (let attempt = 1; attempt <= 12 && !found; attempt++) {
    history = await api(`/api/history?address=${AGENT}`);
    found = Array.isArray(history) && history.some((h: any) => h.txHash === result.swap.txHash);
    console.log(`   attempt ${attempt}: history records ${history.length}; contains this trade: ${found}`);
    if (!found) await new Promise((r) => setTimeout(r, 6000));
  }

  if (!found) throw new Error('history did not surface the executed decision (RPC lag exceeded retry budget)');

  console.log('\n✅ E2E PASS — intent → thesis → debate → swap → on-chain log');
  console.log(`   swap:     ${result.swap.explorerUrl}`);
  console.log(`   decision: ${result.decisionTxHash}`);
  server.close();
  process.exit(0);
} catch (err) {
  console.error('\n❌ E2E FAIL:', (err as Error).message);
  server.close();
  process.exit(1);
}
