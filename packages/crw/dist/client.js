"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCrwBaseUrl = getCrwBaseUrl;
exports.crwSearch = crwSearch;
exports.crwScrape = crwScrape;
const DEFAULT_BASE_URL = "http://crw-eqimab-crw-1:3000";
function getCrwBaseUrl() {
    return (process.env.CRW_INTERNAL_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
}
async function post(path, body) {
    const response = await fetch(`${getCrwBaseUrl()}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`CRW ${path} failed (${response.status}): ${text}`);
    }
    return response.json();
}
async function crwSearch(query, params = {}) {
    const { data } = await post("/v1/search", {
        query,
        ...params,
    });
    return data.results;
}
async function crwScrape(url, params = {}) {
    const { data } = await post("/v1/scrape", {
        url,
        ...params,
    });
    return data;
}
