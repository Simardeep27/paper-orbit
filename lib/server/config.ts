function positiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export type LiveProvider = "semantic-scholar" | "openalex";

export interface ProviderConfig {
  apiKey: string | null;
  liveProvider: LiveProvider;
  minIntervalMs: number;
  timeoutMs: number;
  liveEnabled: boolean;
  recommendationPool: "recent" | "all-cs";
  neighborhoodBudgetMs: number;
  searchBudgetMs: number;
}

export function getProviderConfig(): ProviderConfig {
  return {
    apiKey: process.env.SEMANTIC_SCHOLAR_API_KEY?.trim() || null,
    liveProvider:
      process.env.LIVE_PROVIDER === "openalex"
        ? "openalex"
        : "semantic-scholar",
    minIntervalMs: positiveInt(process.env.UPSTREAM_MIN_INTERVAL_MS, 1100),
    timeoutMs: positiveInt(process.env.UPSTREAM_TIMEOUT_MS, 8000),
    liveEnabled: process.env.ENABLE_LIVE_API !== "false",
    recommendationPool:
      process.env.RECOMMENDATION_POOL === "recent" ? "recent" : "all-cs",
    neighborhoodBudgetMs: 25_000,
    searchBudgetMs: 12_000,
  };
}
