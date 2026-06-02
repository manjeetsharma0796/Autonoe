import { test, expect } from 'bun:test';

// In-memory DB + dummy secret so importing the store touches no real files/keys.
process.env.AUTONOE_DB = ':memory:';
process.env.AUTONOE_SECRET = 'test-secret';

const { generateThesis, structureHumanThesis } = await import('../src/agents/thesis.ts');
const { runDebate } = await import('../src/agents/debate.ts');
const { chat } = await import('../src/agents/assistant.ts');
const type = await import('@autonoe/shared');
void type;

const thesisCore = {
  suggestedPair: 'WMNT',
  reasoning: 'WMNT momentum is constructive with supportive breadth.',
  options: [
    { direction: 'long', asset: 'WMNT', sizeMUSD: 100, rationale: 'breakout', predictedReturnPct: { low: 5, high: 10 }, risk: 'medium' },
    { direction: 'hedge', asset: 'MockBTC', sizeMUSD: 50, rationale: 'cover', predictedReturnPct: { low: -2, high: 4 }, risk: 'low' },
  ],
};
const judgeOut = {
  judgeSummary: 'Option A is the stronger risk-adjusted play.',
  refinedOptions: [
    { optionRef: 'opt-1', predictedOutputPct: 8, risk: 'medium', caveats: ['thin depth'], confidence: 0.72 },
  ],
};

// Fake resolver: structured calls return fixtures by role; plain invoke returns text.
const fakeResolve = (role: string) => ({
  invoke: async () => ({ content: `argument from ${role}` }),
  withStructuredOutput: <T,>() => ({ invoke: async (): Promise<T> => (role === 'judge' ? judgeOut : thesisCore) as T }),
});

test('generateThesis assembles a Thesis with ids, traces and active sources', async () => {
  const thesis = await generateThesis({ intent: 'long the dip' }, fakeResolve as never);
  expect(thesis.source).toBe('ai');
  expect(thesis.options).toHaveLength(2);
  expect(thesis.options[0]!.id).toBe('opt-1');
  expect(thesis.suggestedPair).toBe('WMNT');
  expect(thesis.activeSources.length).toBe(4); // all subagents by default
  expect(thesis.traces?.length).toBe(4);
  expect(thesis.id).toMatch(/[0-9a-f-]{36}/);
});

test('generateThesis honors a subset of active sources', async () => {
  const thesis = await generateThesis(
    { intent: 'hedge', activeSources: ['subagent.onchain', 'subagent.market'] },
    fakeResolve as never,
  );
  expect(thesis.activeSources).toEqual(['subagent.onchain', 'subagent.market']);
  expect(thesis.traces?.length).toBe(2);
});

test('structureHumanThesis marks source human with no subagents', async () => {
  const thesis = await structureHumanThesis(
    { intent: 'my idea', body: 'long WMNT into the incentive news', suggestedPair: 'WMNT' },
    fakeResolve as never,
  );
  expect(thesis.source).toBe('human');
  expect(thesis.activeSources).toHaveLength(0);
  expect(thesis.options.length).toBeGreaterThanOrEqual(2);
});

test('runDebate returns three traces and judge refined options', async () => {
  const thesis = await generateThesis({ intent: 'x' }, fakeResolve as never);
  const result = await runDebate(thesis, fakeResolve as never);
  expect(result.thesisId).toBe(thesis.id);
  expect(result.supporterArgument).toContain('supporter');
  expect(result.discriminatorArgument).toContain('discriminator');
  expect(result.refinedOptions).toHaveLength(1);
  expect(result.refinedOptions[0]!.optionRef).toBe('opt-1');
  expect(result.traces?.map((t) => t.role)).toEqual(['supporter', 'discriminator', 'judge']);
});

test('assistant chat returns an assistant message', async () => {
  const reply = await chat({ messages: [{ role: 'user', content: 'hi' }] }, fakeResolve as never);
  expect(reply.role).toBe('assistant');
  expect(reply.content).toContain('assistant');
});
