// Conversational "Chat" mode for the studio. Unlike assistant.ts `chat()` (which
// forces a trade-scoping briefing format and nudges the user to the tribunal),
// this holds a NORMAL back-and-forth conversation: it answers what is asked, in
// plain prose, like a knowledgeable friend. It runs on the `assistant`-role model,
// reuses the shared get_ticker tool, and can render ```chart```/```heatmap```
// blocks when a few numbers genuinely benefit from a visual.

import type { ChatMessage } from '@autonoe/shared';
import { humanize } from '@autonoe/shared';
import { defaultResolver, type ModelResolver } from '../models.ts';
import { tickerTool } from './assistant.ts';

const SYSTEM = [
  'You are Autonoe, a friendly and sharp crypto trading copilot. Assets trade vs',
  'the mUSD stablecoin on the Mantle testnet: WMNT, BTC, ETH, SUI, SOL.',
  '',
  'You hold a NORMAL conversation. Answer exactly what the user asks, conversationally,',
  'in plain prose, like a knowledgeable friend would. Let the user lead.',
  '',
  'Use the `get_ticker` tool whenever the user asks about the price, 24h change, or',
  'volume of ANY token. Call it with the bare ticker symbol (e.g. "BTC", "WMNT",',
  '"PEPE") - do not append USDT yourself.',
  '',
  'You MAY render a chart or heatmap ONLY when a few numbers genuinely benefit from a',
  'visual. Do not force one in. When you do:',
  '- A few numbers (returns, risk, momentum): a fenced chart block, for example',
  '  ```chart',
  '  {"type":"bar","title":"4h momentum","unit":"%","data":[{"label":"WMNT","value":4.2},{"label":"BTC","value":-1.1}]}',
  '  ```',
  '- A correlation or risk matrix: a fenced heatmap block, for example',
  '  ```heatmap',
  '  {"title":"30d correlation","x":["BTC","ETH"],"y":["BTC","ETH"],"values":[[1,0.82],[0.82,1]]}',
  '  ```',
  '  Keep charts to 6 points or fewer. Only use a visual when it adds clarity.',
  '',
  'Do NOT force "## Section" headers onto every reply. Do NOT end with a canned',
  'call-to-action and do NOT tell the user to send anything to the tribunal. Just be',
  'helpful and natural.',
  '',
  'Keep replies reasonably tight: a short paragraph or two, not an essay.',
  '',
  'HARD RULE: never output the em dash or en dash character. Use commas, colons, or a',
  'hyphen (-) instead. This is non-negotiable.',
].join('\n');

/**
 * Hold a normal conversation on the `assistant`-role model. Mirrors assistant.ts
 * `chat()`: bind the ticker tool, run a small tool-calling loop, then return (and
 * optionally stream) the final humanized answer. Markdown is preserved on purpose
 * (chat legitimately uses ```chart```/```heatmap``` blocks and light formatting).
 */
export async function chatConversational(
  { messages }: { messages: ChatMessage[] },
  resolve: ModelResolver = defaultResolver,
  onToken?: (t: string) => void,
): Promise<string> {
  const convo = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
  const prompt = `${SYSTEM}\n\n${convo}\n\nASSISTANT:`;

  // Bind the ticker tool if the model supports it; fall back to plain invoke otherwise.
  const baseModel = resolve('assistant', { temperature: 0.7, onToken });
  const model = typeof (baseModel as unknown as { bindTools?: unknown }).bindTools === 'function'
    ? (baseModel as unknown as { bindTools: (t: unknown[]) => typeof baseModel }).bindTools([tickerTool])
    : baseModel;

  let res = await model.invoke(prompt);

  // Simple tool loop: run tool calls until the model stops requesting them (cap ~5 steps).
  let steps = 0;
  while (Array.isArray(res.tool_calls) && res.tool_calls.length > 0 && steps < 5) {
    steps += 1;
    const toolResults: string[] = [];
    for (const call of res.tool_calls as Array<{ name: string; args: Record<string, unknown> }>) {
      if (call.name === 'get_ticker') {
        try {
          const result = await tickerTool.invoke(call.args as { symbol: string });
          toolResults.push(String(result));
        } catch (e) {
          toolResults.push(`Error fetching price: ${(e as Error).message}`);
        }
      }
    }
    // Feed tool results back and get the next response (streams the final answer).
    const toolContext = toolResults.join('\n');
    res = await baseModel.invoke(`${prompt}\n\nTOOL RESULTS:\n${toolContext}\n\nASSISTANT:`);
  }

  const content = typeof res.content === 'string' ? res.content : String(res.content ?? '');
  return humanize(content);
}
