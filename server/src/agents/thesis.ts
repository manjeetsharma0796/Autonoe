// T-205 - the thesis agent. A real tool-calling loop: the model decides which
// market/indicator/on-chain tools to call based on the user's intent, then a
// structured finalize call turns the gathered evidence into a risk-tiered thesis.
// Tools actually used become the reasoning traces ("Show thinking").

import { z } from 'zod';
import { SystemMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { SUBAGENT_ROLES, humanizeDeep, type AIRole, type Thesis, type ThesisOption } from '@autonoe/shared';
import { defaultResolver, type ModelResolver } from '../models.ts';
import { resolveRole } from '../roles.ts';
import { makeRecorder, makeTools } from './tools.ts';
import type { Fetcher } from '../market/bybit.ts';

const Option = z.object({
  direction: z.enum(['long', 'short', 'hedge', 'hold']),
  asset: z.enum(['WMNT', 'BTC', 'ETH', 'SUI', 'SOL']),
  sizeMUSD: z.number().describe('position size in mUSD'),
  rationale: z.string(),
  predictedReturnPct: z.object({ low: z.number(), high: z.number() }),
  risk: z.enum(['low', 'medium', 'high']),
});

const ThesisCore = z.object({
  suggestedPair: z.enum(['WMNT', 'BTC', 'ETH', 'SUI', 'SOL']),
  reasoning: z.string().describe('overall reasoning grounded in the tool evidence, 2-4 sentences'),
  // min(1) (not 2): some providers hard-REJECT the tool call when the model
  // returns a single option ("/options: minimum 2 items"), which would dead-end
  // the whole flow. We accept >=1 here and guarantee >=2 in code (ensureTwoOptions).
  options: z.array(Option).min(1).max(4),
});
type ThesisCore = z.infer<typeof ThesisCore>;

/** The panel and debate need a real choice. If the model returned a single
 *  option, synthesize a conservative half-size counterpart so the UI always
 *  has >=2 without ever failing the structured-output call. */
function ensureTwoOptions(options: ThesisCore['options']): ThesisCore['options'] {
  if (options.length >= 2) return options;
  const [first] = options;
  if (!first) return options;
  const half = Math.max(1, Math.round(first.sizeMUSD / 2));
  return [
    first,
    {
      direction: first.direction,
      asset: first.asset,
      sizeMUSD: half,
      rationale: `Conservative half-size alternative: the same view on ${first.asset} at reduced exposure to cap drawdown while staying positioned.`,
      predictedReturnPct: {
        low: Math.round(first.predictedReturnPct.low / 2),
        high: Math.round(first.predictedReturnPct.high / 2),
      },
      risk: first.risk === 'high' ? 'medium' : 'low',
    },
  ];
}

const SYSTEM =
  'You are Autonoe, an autonomous crypto trading strategist on the Mantle testnet. ' +
  'Assets tradable against the mUSD stablecoin: WMNT (real AMM), BTC, ETH, SUI, SOL (synthetics). ' +
  'Use the available tools to gather real price, candle, indicator and on-chain evidence for the ' +
  'assets relevant to the user intent before forming a view. Be specific and honest about risk. ' +
  'When you write reasoning or rationale prose, structure it with short bold labels and tag risk ' +
  'as (High), (Medium) or (Low) where useful, and use a plain ASCII arrow "->" for cause and effect. ' +
  'HARD RULE: never output the em dash or en dash character anywhere; use a hyphen (-) instead.';

const MAX_STEPS = 5;

function assemble(core: ThesisCore, intent: string, source: 'ai' | 'human', used: AIRole[]): Thesis {
  const options: ThesisOption[] = ensureTwoOptions(core.options).map((o, i) => ({ id: `opt-${i + 1}`, ...o }));
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

export interface ThesisOpts {
  resolve?: ModelResolver;
  /** Injected fetcher for the market tools (tests supply fixtures). */
  fetcher?: Fetcher;
}

export async function generateThesis(
  input: { intent: string; activeSources?: AIRole[] },
  opts: ThesisOpts = {},
): Promise<Thesis> {
  const resolve = opts.resolve ?? defaultResolver;
  const active = input.activeSources?.length ? input.activeSources : [...SUBAGENT_ROLES];
  const rec = makeRecorder();
  const { tools, byName } = makeTools(rec, active, opts.fetcher);

  const base = resolve('thesis', { temperature: 0.4 });
  const model = base.bindTools ? base.bindTools(tools) : base;

  const messages: unknown[] = [
    new SystemMessage(SYSTEM),
    new HumanMessage(
      `USER INTENT:\n${input.intent}\n\nCall the tools you need on the relevant assets, then stop.`,
    ),
  ];

  for (let step = 0; step < MAX_STEPS; step++) {
    const ai = await model.invoke(messages);
    messages.push(ai);
    const calls = ai.tool_calls ?? [];
    if (calls.length === 0) break;
    for (const c of calls) {
      const t = byName.get(c.name);
      let out: string;
      try {
        out = t ? String(await t.invoke(c.args)) : `unknown tool: ${c.name}`;
      } catch (e) {
        out = `tool ${c.name} failed: ${(e as Error).message}`;
      }
      messages.push(new ToolMessage({ content: out, tool_call_id: c.id ?? c.name, name: c.name }));
    }
  }

  const core = await base
    .withStructuredOutput<ThesisCore>(ThesisCore, { name: 'thesis' })
    .invoke([
      ...messages,
      new HumanMessage(
        'Now output the final thesis as structured data, grounded strictly in the tool evidence above. ' +
          'Provide 2 to 4 DISTINCT risk-tiered options (vary the size, direction, or risk) so the user has a real choice.',
      ),
    ]);

  const traces = rec.traces();
  const used = [...new Set(traces.map((t) => t.role))];
  const thesis = assemble(core, input.intent, 'ai', used.length ? used : active);
  thesis.traces = traces;
  return humanizeDeep(thesis);
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
  return humanizeDeep(assemble({ ...core, suggestedPair: input.suggestedPair }, input.intent, 'human', []));
}
