// T-208 — conversational assistant for the Trade-page side rail. Runs on the
// `assistant`-role model. Returns a full reply (route can switch to streaming later).

import type { ChatMessage } from '@autonoe/shared';
import { defaultResolver, type ModelResolver } from '../models.ts';

const SYSTEM =
  'You are Autonoe, a concise crypto trading copilot on the Mantle testnet (assets vs mUSD: ' +
  'WMNT, MockBTC, MockETH). Answer the user clearly. If they ask for a trade idea, suggest they ' +
  'send it to the tribunal for a full thesis + verdict.';

export async function chat(
  input: { messages: ChatMessage[]; context?: Record<string, unknown> },
  resolve: ModelResolver = defaultResolver,
): Promise<ChatMessage> {
  const model = resolve('assistant', { temperature: 0.5 });
  const ctx = input.context ? `\n\nCONTEXT: ${JSON.stringify(input.context)}` : '';
  const convo = input.messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
  const res = await model.invoke(`${SYSTEM}${ctx}\n\n${convo}\n\nASSISTANT:`);
  const content = typeof res.content === 'string' ? res.content : String(res.content ?? '');
  return { role: 'assistant', content };
}
