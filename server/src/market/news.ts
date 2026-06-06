// Tavily web-search integration for the subagent.news tool (T-209).
// Gracefully disabled when TAVILY_API_KEY is absent — never throws or
// breaks a thesis run in that case.

const TAVILY_URL = 'https://api.tavily.com/search';

/** Injectable fetcher that supports POST with headers/body (unlike the GET-only Fetcher in bybit.ts). */
export type NewsFetcher = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const defaultNewsFetcher: NewsFetcher = (url, init) => fetch(url, init);

export interface NewsItem {
  title: string;
  url: string;
  snippet: string;
  published?: string;
}

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  published_date?: string;
}

interface TavilyResponse {
  results?: TavilyResult[];
}

/**
 * Search recent news via Tavily.
 *
 * Returns `{ configured: false, items: [] }` when no API key is set — callers
 * must NOT throw in that case so theses degrade gracefully.
 */
export async function searchNews(
  query: string,
  opts?: { fetcher?: NewsFetcher; apiKey?: string; maxResults?: number },
): Promise<{ configured: boolean; items: NewsItem[] }> {
  const apiKey = opts?.apiKey ?? process.env.TAVILY_API_KEY ?? '';
  if (!apiKey) {
    return { configured: false, items: [] };
  }

  const fetcher = opts?.fetcher ?? defaultNewsFetcher;
  const maxResults = opts?.maxResults ?? 5;

  const res = await fetcher(TAVILY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      topic: 'news',
      search_depth: 'basic',
      max_results: maxResults,
    }),
  });

  if (!res.ok) {
    throw new Error(`Tavily search failed: HTTP ${res.status}`);
  }

  const json = (await res.json()) as TavilyResponse;
  const results = json.results ?? [];

  const items: NewsItem[] = results.map((r) => ({
    title: r.title ?? '',
    url: r.url ?? '',
    snippet: r.content ?? '',
    ...(r.published_date ? { published: r.published_date } : {}),
  }));

  return { configured: true, items };
}
