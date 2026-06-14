// T-208 - conversational assistant for the Trade-page side rail. Runs on the
// `assistant`-role model. Returns a full reply (route can switch to streaming later).

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { ChatMessage } from '@autonoe/shared';
import { humanize } from '@autonoe/shared';
import { defaultResolver, type ModelResolver } from '../models.ts';
import { getTickerBySymbol } from '../market/bybit.ts';

const SYSTEM = [
  'You are Autonoe, a crypto trading copilot on the Mantle testnet',
  '(assets traded vs the mUSD stablecoin: WMNT, BTC, ETH, SUI, SOL).',
  '',
  'Format every answer as a clear, scannable briefing in Markdown:',
  '- When the answer has more than one point, group it under "## Section" headers',
  '  (for example: Key Drivers, Risk Assessment, Read).',
  '- Use bullet points that start with a bold label, and tag importance as',
  '  (High), (Medium) or (Low) where it helps. Example: "- **Funding flip (High)**: ...".',
  '- Use a plain ASCII arrow "->" to show cause and effect inside a bullet.',
  '- Be tight and specific. No preamble, no sign-off, no filler.',
  '',
  'When it genuinely helps, render data visually:',
  '- Comparative data: a GitHub-flavored Markdown table.',
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
  'You have a `get_ticker` tool. Use it whenever the user asks about the price,',
  '24h change, or volume of ANY token. Call it with the bare ticker symbol',
  '(e.g. "BTC", "WMNT", "PEPE") - do not append USDT yourself.',
  '',
  'HARD RULE: never output the em dash or en dash character. Use commas, colons,',
  'or a hyphen (-) instead. This is non-negotiable.',
  '',
  'If the user asks for a trade idea, suggest sending it to the tribunal for a full',
  'thesis and verdict.',
].join('\n');

/** Fetch live Bybit spot price for any symbol. */
export const tickerTool = tool(
  async ({ symbol }: { symbol: string }) => {
    const sym = symbol.trim().toUpperCase();
    const bybitSymbol = sym.endsWith('USDT') ? sym : `${sym}USDT`;
    const t = await getTickerBySymbol(bybitSymbol);
    return `${sym}: price $${t.price}, 24h ${t.change24hPct.toFixed(2)}%, vol $${t.volume24h.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  },
  {
    name: 'get_ticker',
    description: 'Fetch live Bybit spot price for any token symbol (e.g. BTC, WMNT, PEPE).',
    schema: z.object({ symbol: z.string().describe('Bare ticker symbol without USDT suffix') }),
  },
);

export async function chat(
  input: { messages: ChatMessage[]; context?: Record<string, unknown> },
  resolve: ModelResolver = defaultResolver,
): Promise<ChatMessage> {
  const ctx = input.context ? `\n\nCONTEXT: ${JSON.stringify(input.context)}` : '';
  const convo = input.messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
  const prompt = `${SYSTEM}${ctx}\n\n${convo}\n\nASSISTANT:`;

  // Bind the ticker tool if the model supports it; fall back to plain invoke otherwise.
  const baseModel = resolve('assistant', { temperature: 0.5 });
  const model = typeof (baseModel as unknown as { bindTools?: unknown }).bindTools === 'function'
    ? (baseModel as unknown as { bindTools: (t: unknown[]) => typeof baseModel }).bindTools([tickerTool])
    : baseModel;

  let res = await model.invoke(prompt);

  // Simple tool loop: run tool calls until the model stops requesting them.
  while (Array.isArray(res.tool_calls) && res.tool_calls.length > 0) {
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
    // Feed tool results back and get the next response.
    const toolContext = toolResults.join('\n');
    res = await baseModel.invoke(`${prompt}\n\nTOOL RESULTS:\n${toolContext}\n\nASSISTANT:`);
  }

  const content = typeof res.content === 'string' ? res.content : String(res.content ?? '');
  return { role: 'assistant', content: humanize(content) };
}
