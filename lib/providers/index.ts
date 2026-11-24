import type {
  ApiErrorCode,
  Neighborhood,
  Paper,
  ResolveResult,
  SearchResultSet,
  SourceMode,
} from "@/lib/types";
import { AppError } from "@/lib/server/errors";
import { buildCacheKey, CACHE_TTL, getCache } from "@/lib/server/cache";
import { getProviderConfig } from "@/lib/server/config";
import type { BranchData, RecommendationData } from "@/lib/graph/normalize";
import { buildNeighborhood } from "@/lib/graph/build";
import {
  DemoCenterUnavailableError,
  DemoUnavailableError,
  getDemoNeighborhood,
  isDemoAvailable,
  resolveDemoPaper,
  searchDemoCatalog,
} from "@/lib/providers/demo";
import {
  SnapshotCenterUnavailableError,
  SnapshotUnavailableError,
  getSnapshotNeighborhood,
  isSnapshotAvailable,
  resolveSnapshotPaper,
  searchSnapshotCatalog,
} from "@/lib/providers/snapshot";
import {
  canonicalizeIdentifier,
  getCitingLive,
  getPaperLive,
  getRecommendationsLive,
  getReferencesLive,
  resolveLive,
  searchLive,
  SEARCH_FIELDS,
  type LiveBranch,
  type LiveRecommendationBranch,
} from "@/lib/providers/semantic-scholar";

const SCHEMA_VERSION = 1;

function liveCache<T>(name: string) {
  return getCache<T>(name);
}

function offlineError(error: unknown, label: string): AppError {
  if (
    error instanceof DemoCenterUnavailableError ||
    error instanceof SnapshotCenterUnavailableError
  ) {
    return new AppError("DEMO_CENTER_UNAVAILABLE", error.message);
  }
  if (
    error instanceof DemoUnavailableError ||
    error instanceof SnapshotUnavailableError
  ) {
    return new AppError("PROVIDER_CONFIGURATION", error.message);
  }
  return new AppError(
    "PROVIDER_UNAVAILABLE",
    `The ${label} could not be loaded.`,
  );
}

export async function searchPapers(
  query: string,
  offset: number,
  mode: SourceMode,
): Promise<SearchResultSet> {
  if (mode === "demo") {
    try {
      return await searchDemoCatalog(query, offset, 10);
    } catch (error) {
      throw offlineError(error, "offline demo");
    }
  }
  if (mode === "snapshot") {
    try {
      return await searchSnapshotCatalog(query, offset, 10);
    } catch (error) {
      throw offlineError(error, "stored snapshot");
    }
  }
  const config = getProviderConfig();
  if (!config.liveEnabled) {
    throw new AppError(
      "PROVIDER_CONFIGURATION",
      "Live search is disabled by ENABLE_LIVE_API. Use the offline demo or enable live access.",
    );
  }
  const cache = liveCache<SearchResultSet>("live-search");
  const key = buildCacheKey(
    "semantic-scholar",
    "paper-search",
    { query: query.trim().toLowerCase(), offset },
    SEARCH_FIELDS,
    SCHEMA_VERSION,
  );
  const cached = cache.get(key);
  if (cached) return cached;
  const result = await searchLive(
    query,
    offset,
    Date.now() + config.searchBudgetMs,
  );
  const response: SearchResultSet = {
    papers: result.papers,
    nextOffset: result.nextOffset,
    sourceMode: "live",
    fetchedAt: result.fetchedAt,
  };
  cache.set(key, response, CACHE_TTL.search);
  return response;
}

export async function resolvePaper(
  input: string,
  mode: SourceMode,
): Promise<ResolveResult> {
  const canonical = canonicalizeIdentifier(input);
  if (mode === "demo") {
    try {
      if (canonical.kind === "query") {
        const search = await searchDemoCatalog(input, 0, 1);
        const paper = search.papers[0];
        if (!paper) {
          throw new AppError(
            "NOT_FOUND",
            "No paper in the offline catalog matched that search.",
          );
        }
        return { paper, sourceMode: "demo" };
      }
      const direct = await resolveDemoPaper(input);
      if (!direct) {
        throw new AppError(
          "NOT_FOUND",
          "That identifier is not present in the offline demo catalog.",
        );
      }
      return { paper: direct, sourceMode: "demo" };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw offlineError(error, "offline demo");
    }
  }

  if (mode === "snapshot") {
    try {
      if (canonical.kind === "query") {
        const search = await searchSnapshotCatalog(input, 0, 1);
        const paper = search.papers[0];
        if (!paper) {
          throw new AppError(
            "NOT_FOUND",
            "No paper in the stored snapshot catalog matched that search.",
          );
        }
        return { paper, sourceMode: "snapshot" };
      }
      const direct = await resolveSnapshotPaper(input);
      if (!direct) {
        throw new AppError(
          "NOT_FOUND",
          "That identifier is not present in the stored snapshot catalog.",
        );
      }
      return { paper: direct, sourceMode: "snapshot" };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw offlineError(error, "stored snapshot");
    }
  }

  const config = getProviderConfig();
  if (!config.liveEnabled) {
    throw new AppError(
      "PROVIDER_CONFIGURATION",
      "Live lookup is disabled by ENABLE_LIVE_API. Use the offline demo or enable live access.",
    );
  }
  const cache = liveCache<Paper>("live-paper");
  const key = buildCacheKey(
    "semantic-scholar",
    "paper-resolve",
    { kind: canonical.kind, value: canonical.value.toLowerCase() },
    ["paperId"],
    SCHEMA_VERSION,
  );
  const cached = cache.get(key);
  if (cached) return { paper: cached, sourceMode: "live" };
  const paper = await resolveLive(
    canonical,
    Date.now() + config.searchBudgetMs,
  );
  cache.set(key, paper, CACHE_TTL.metadata);
  return { paper, sourceMode: "live" };
}

function emptyBranch(
  requestedLimit: number,
  error: unknown,
  label: string,
): BranchData {
  const appError = error instanceof AppError ? error : null;
  const originalCode: ApiErrorCode =
    appError?.code ?? "PROVIDER_UNAVAILABLE";
  const code: ApiErrorCode =
    originalCode === "NOT_FOUND" ? "PROVIDER_UNAVAILABLE" : originalCode;
  const message =
    code === "RATE_LIMITED"
      ? `Rate limited while loading ${label.toLowerCase()}. ${
          appError?.retryAfterSeconds
            ? `Retry after about ${appError.retryAfterSeconds} seconds.`
            : ""
        }`
      : code === "UPSTREAM_TIMEOUT"
        ? `Timed out while loading ${label.toLowerCase()}.`
        : appError?.message || `Provider error while loading ${label.toLowerCase()}.`;
  return {
    papers: [],
    receivedEntries: 0,
    skippedEntries: 0,
    requestedLimit,
    nextOffset: null,
    status: originalCode === "NOT_FOUND" ? "unavailable" : "error",
    message,
  };
}

function emptyRecommendationBranch(
  requestedLimit: number,
  error: unknown,
): RecommendationData {
  const base = emptyBranch(requestedLimit, error, "Recommendations");
  return {
    items: [],
    receivedEntries: base.receivedEntries,
    skippedEntries: base.skippedEntries,
    requestedLimit: base.requestedLimit,
    nextOffset: base.nextOffset,
    status: base.status,
    message: base.message,
  };
}

function branchToInput(branch: LiveBranch): BranchData {
  return {
    papers: branch.papers,
    receivedEntries: branch.receivedEntries,
    skippedEntries: branch.skippedEntries,
    requestedLimit: branch.requestedLimit,
    nextOffset: branch.nextOffset,
  };
}

function recommendationsToInput(
  branch: LiveRecommendationBranch,
): RecommendationData {
  return {
    items: branch.items,
    receivedEntries: branch.receivedEntries,
    skippedEntries: branch.skippedEntries,
    requestedLimit: branch.requestedLimit,
    nextOffset: branch.nextOffset,
  };
}

export async function getNeighborhood(
  paperId: string,
  mode: SourceMode,
): Promise<Neighborhood> {
  if (mode === "demo") {
    try {
      return await getDemoNeighborhood(paperId);
    } catch (error) {
      throw offlineError(error, "offline demo");
    }
  }
  if (mode === "snapshot") {
    try {
      return await getSnapshotNeighborhood(paperId);
    } catch (error) {
      throw offlineError(error, "stored snapshot");
    }
  }

  const config = getProviderConfig();
  if (!config.liveEnabled) {
    throw new AppError(
      "PROVIDER_CONFIGURATION",
      "Live neighborhoods are disabled by ENABLE_LIVE_API. Use the offline demo or enable live access.",
    );
  }

  const cache = liveCache<Neighborhood>("live-neighborhood");
  const cacheKey = buildCacheKey(
    "semantic-scholar",
    "neighborhood",
    { paperId },
    SEARCH_FIELDS,
    SCHEMA_VERSION,
    { pool: config.recommendationPool },
  );
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const deadline = Date.now() + config.neighborhoodBudgetMs;
  const fetchedAt = new Date().toISOString();
  const center = await getPaperLive(paperId, deadline);

  const [referencesResult, citingResult, recommendedResult] =
    await Promise.allSettled([
      getReferencesLive(center.id, deadline),
      getCitingLive(center.id, deadline),
      getRecommendationsLive(center.id, config.recommendationPool, deadline),
    ]);

  const references =
    referencesResult.status === "fulfilled"
      ? branchToInput(referencesResult.value)
      : emptyBranch(40, referencesResult.reason, "References");
  const citing =
    citingResult.status === "fulfilled"
      ? branchToInput(citingResult.value)
      : emptyBranch(40, citingResult.reason, "Citing papers");
  const recommended =
    recommendedResult.status === "fulfilled"
      ? recommendationsToInput(recommendedResult.value)
      : emptyRecommendationBranch(20, recommendedResult.reason);

  const warnings = [
    "This is a bounded live sample: up to 40 references, 40 citing papers, and 20 recommendations. It is not a complete citation graph.",
    "Provider citation totals and retrieved neighbor counts are shown separately in Data info.",
  ];

  const neighborhood = buildNeighborhood({
    center,
    references,
    citing,
    recommended,
    mode: "live",
    provider: "semantic-scholar",
    fetchedAt,
    recommendationPool: config.recommendationPool,
    warnings,
  });

  const hasFailure =
    references.status === "error" ||
    citing.status === "error" ||
    recommended.status === "error" ||
    references.status === "unavailable" ||
    citing.status === "unavailable" ||
    recommended.status === "unavailable";
  cache.set(
    cacheKey,
    neighborhood,
    hasFailure ? CACHE_TTL.partial : CACHE_TTL.neighborhood,
  );
  return neighborhood;
}

export async function getHealth() {
  const config = getProviderConfig();
  let demoAvailable = false;
  try {
    demoAvailable = await isDemoAvailable();
  } catch {
    demoAvailable = false;
  }
  let snapshotAvailable = false;
  try {
    snapshotAvailable = await isSnapshotAvailable();
  } catch {
    snapshotAvailable = false;
  }
  return {
    ok: true as const,
    liveConfigured: config.liveEnabled,
    liveKeyConfigured: Boolean(config.apiKey),
    demoAvailable,
    snapshotAvailable,
  };
}
