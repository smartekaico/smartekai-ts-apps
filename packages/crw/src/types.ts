export interface SearchResult {
  title?: string;
  url?: string;
  description?: string;
}

export interface SearchParams {
  limit?: number;
  lang?: string;
  tbs?: string;
  sources?: string;
}

export interface ScrapeResult {
  markdown?: string;
  html?: string;
  metadata?: {
    title?: string;
    url?: string;
  };
}

export interface ScrapeParams {
  render?: boolean;
}