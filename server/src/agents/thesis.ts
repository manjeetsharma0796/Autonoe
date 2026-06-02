// T-205 — the thesis agent. Orchestrates the active subagents, then asks the
// `thesis`-role model for a structured multi-option thesis. Also structures a
// human-written thesis into the same shape (source: 'human').

import { z } from 'zod';
import type { AIRole, Thesis, ThesisOption } from '@autonoe/shared';
import { runSubagents } from './subagents.ts';
import { defaultResolver, type ModelResolver } from '../models.ts';
import { resolveRole } from '../roles.ts';

const Option = z.object({
  direction: z.enum(['long', 'short', 'hedge', 'hold']),
  asset: z.enum(['WMNT', 'MockBTC', 'MockETH']),
  sizeMUSD: z.number().describe('position size in mUSD'),
  rationale: z.string(),
  predictedReturnPct: z.object({ low: z.number(), high: z.number() }),
  risk: z.enum(['low', 'medium', 'high']),
});

const ThesisCore = z.object({
  suggestedPair: z.enum(['WMNT', 'MockBTC', 'MockETH']),
  reasoning: z.string().describe('overall reasoning, 2-4 sentences'),
  options: z.array(Option).min(2).max(4),
});
type ThesisCore = z.infer<typeof ThesisCore>;

const SYSTEM =
  'You are Autonoe, an autonomous crypto trading strategist on the Mantle testnet. ' +
  'Assets tradable against the mUSD stablecoin: WMNT, MockBTC, MockETH. ' +
  'Given the user intent and research context, produce a concise, risk-tiered thesis with ' +
  '2-4 concrete, executable options. Be specific and honest about risk. All sizes in mUSD.';

function assemble(core: ThesisCore, intent: string, source: 'ai' | 'human', used: AIRole[]): Thesis {
  const options: ThesisOption[] = core.options.map((o, i) => ({ id: `opt-${i + 1}`, ...o }));
  return {
    id: crypto.randomUUID(),
    intent,
    source,
    suggestedPair: core.suggestedPair,
    activeSources: used,
    options,
    reasoning: core.reasoning,
    modelsUsed: { thesis: resolveRole('thesis') },
    createdAt: new Date().toISOString(),
  };
}

export async function generateThesis(
  input: { intent: string; activeSources?: AIRole[] },
  resolve: ModelResolver = defaultResolver,
): Promise<Thesis> {
  const { context, traces, used } = await runSubagents(input.intent, input.activeSources);
  const model = resolve('thesis', { temperature: 0.5 });
  const structured = model.withStructuredOutput<ThesisCore>(ThesisCore, { name: 'thesis' });
  const prompt =
    `${SYSTEM}\n\nUSER INTENT:\n${input.intent}\n\nRESEARCH CONTEXT:\n${context}\n\n` +
    'Return the thesis now.';
  const core = await structured.invoke(prompt);
  const thesis = assemble(core, input.intent, 'ai', used);
  thesis.traces = traces;
  return thesis;
}

export async function structureHumanThesis(
  input: { intent: string; body: string; suggestedPair: Thesis['suggestedPair'] },
  resolve: ModelResolver = defaultResolver,
): Promise<Thesis> {
  const model = resolve('thesis', { temperature: 0.2 });
  const structured = model.withStructuredOutput<ThesisCore>(ThesisCore, { name: 'thesis' });
  const prompt =
    `${SYSTEM}\n\nThe user has written their own thesis. Convert it faithfully into structured, ` +
    `risk-tiered options without inventing new directions.\n\nINTENT:\n${input.intent}\n\n` +
    `USER THESIS:\n${input.body}\n\nSuggested pair: ${input.suggestedPair}.`;
  const core = await structured.invoke(prompt);
  const thesis = assemble({ ...core, suggestedPair: input.suggestedPair }, input.intent, 'human', []);
  return thesis;
}
