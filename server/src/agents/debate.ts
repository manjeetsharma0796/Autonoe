// T-206 — the debate panel. Supporter argues for the thesis, Discriminator
// argues against, Judge synthesizes both into refined, risk-graded options.
// Each role runs on its own configured model and contributes a reasoning trace.

import { z } from 'zod';
import type { DebateResult, ReasoningTrace, Thesis } from '@autonoe/shared';
import { defaultResolver, type ChatModelLike, type ModelResolver } from '../models.ts';

const JudgeOut = z.object({
  judgeSummary: z.string(),
  refinedOptions: z
    .array(
      z.object({
        optionRef: z.string().describe('id of the thesis option, e.g. opt-1'),
        predictedOutputPct: z.number(),
        risk: z.enum(['low', 'medium', 'high']),
        caveats: z.array(z.string()),
        confidence: z.number().min(0).max(1),
      }),
    )
    .min(1),
});
type JudgeOut = z.infer<typeof JudgeOut>;

function asText(r: { content: unknown }): string {
  const c = r.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map((x) => (typeof x === 'string' ? x : ((x as { text?: string }).text ?? ''))).join('');
  return String(c ?? '');
}

function summarize(intent: string, options: Thesis['options']): string {
  const opts = options
    .map((o) => `${o.id}: ${o.direction} ${o.asset} ${o.sizeMUSD} mUSD (risk ${o.risk}) — ${o.rationale}`)
    .join('\n');
  return `INTENT: ${intent}\n\nOPTIONS:\n${opts}`;
}

export async function runDebate(
  thesis: Thesis,
  resolve: ModelResolver = defaultResolver,
): Promise<DebateResult> {
  const brief = summarize(thesis.intent, thesis.options);

  const supporter = resolve('supporter', { temperature: 0.6 });
  const discriminator = resolve('discriminator', { temperature: 0.6 });
  const judge = resolve('judge', { temperature: 0.3 });

  const supporterArgument = asText(
    await supporter.invoke(
      `You are the SUPPORTER on a trading tribunal. Make the strongest evidence-based bull case ` +
        `for this thesis. Be specific, 3-5 sentences.\n\n${brief}`,
    ),
  );

  const discriminatorArgument = asText(
    await discriminator.invoke(
      `You are the DISCRIMINATOR (devil's advocate) on a trading tribunal. Attack this thesis: ` +
        `liquidity, drawdown, regime risk, every way it loses. Be specific, 3-5 sentences.\n\n${brief}`,
    ),
  );

  const judged = await judge
    .withStructuredOutput<JudgeOut>(JudgeOut, { name: 'verdict' })
    .invoke(
      `You are the JUDGE on a trading tribunal. Weigh the Supporter and Discriminator, then issue ` +
        `refined options referencing the thesis option ids. Give a predicted % outcome, risk, ` +
        `caveats, and a 0-1 confidence per option.\n\n${brief}\n\n` +
        `SUPPORTER:\n${supporterArgument}\n\nDISCRIMINATOR:\n${discriminatorArgument}`,
    );

  const traces: ReasoningTrace[] = [
    { role: 'supporter', summary: 'Bull case', steps: [{ label: 'Argument', detail: supporterArgument }] },
    { role: 'discriminator', summary: 'Bear case', steps: [{ label: 'Argument', detail: discriminatorArgument }] },
    { role: 'judge', summary: 'Synthesis', steps: [{ label: 'Verdict', detail: judged.judgeSummary }] },
  ];

  return {
    thesisId: thesis.id,
    supporterArgument,
    discriminatorArgument,
    judgeSummary: judged.judgeSummary,
    refinedOptions: judged.refinedOptions,
    traces,
  };
}
