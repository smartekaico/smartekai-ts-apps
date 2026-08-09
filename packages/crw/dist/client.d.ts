import type { ScrapeParams, ScrapeResult, SearchParams, SearchResult } from "./types";
export declare function getCrwBaseUrl(): string;
export declare function crwSearch(query: string, params?: SearchParams): Promise<SearchResult[]>;
export declare function crwScrape(url: string, params?: ScrapeParams): Promise<ScrapeResult>;
