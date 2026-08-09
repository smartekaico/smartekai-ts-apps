import type { ScrapeParams, ScrapeResult, SearchParams, SearchResult } from "./types";

const DEFAULT_BASE_URL = "http://crw-eqimab-crw-1:3000";

export function getCrwBaseUrl(): string {
  return (process.env.CRW_INTERNAL_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${getCrwBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CRW ${path} failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<T>;
}

interface SearchResponse {
  data: { results: SearchResult[] };
}

interface ScrapeResponse {
  data: ScrapeResult;
}

export async function crwSearch(
  query: string,
  params: SearchParams = {}
): Promise<SearchResult[]> {
  const { data } = await post<SearchResponse>("/v1/search", {
    query,
    ...params,
  });
  return data.results;
}

export async function crwScrape(
  url: string,
  params: ScrapeParams = {}
): Promise<ScrapeResult> {
  const { data } = await post<ScrapeResponse>("/v1/scrape", {
    url,
    ...params,
  });
  return data;
}