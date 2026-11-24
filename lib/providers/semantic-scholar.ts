import { z } from "zod";
import type { Paper, RecommendationPool } from "@/lib/types";
import type { CanonicalIdentifier } from "@/lib/identifiers";
import { normalizePaper } from "@/lib/graph/normalize";
import { AppError } from "@/lib/server/errors";
import {
  buildCacheKey,
  CACHE_TTL,
  getCache,
} from "@/lib/server/cache";
import { getProviderConfig } from "@/lib/server/config";
import {
  getSharedCoalescer,
  getSharedScheduler,
  parseRetryAfterSeconds,
  retryBackoffMs,
  systemClock,
} from "@/lib/server/rate-limit";

const GRAPH_BASE = "https://api.semanticscholar.org/graph/v1";
const RECOMMENDATIONS_BASE = "https://api.semanticscholar.org/recommendations/v1";
const SCHEMA_VERSION = 1;

export const PAPER_FIELDS = [
  "paperId",
  "title",
  "year",
  "authors",
  "venue",
  "citationCount",
  "referenceCount",
  "url",
  "externalIds",
  "abstract",
] as const;

export const SEARCH_FIELDS = PAPER_FIELDS.filter(
  (field) => field !== "abstract",
);

const looseString = z.union([z.string(), z.number()]);
const looseNumber = z.union([z.number(), z.string()]);

const rawAuthorSchema = z
  .object({
    authorId: looseString.nullable().optional(),
    name: z.string().nullable().optional(),
  })
  .passthrough();

const rawExternalIdsSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.null()]))
  .nullable()
  .optional();

export const rawPaperSchema = z
  .object({
    paperId: looseString.nullable().optional(),
    title: z.string().nullable().optional(),
    year: looseNumber.nullable().optional(),
    authors: z.array(rawAuthorSchema).nullable().optional(),
    venue: z.string().nullable().optional(),
    citationCount: looseNumber.nullable().optional(),
    referenceCount: looseNumber.nullable().optional(),
    url: z.string().nullable().optional(),
    externalIds: rawExternalIdsSchema,
    abstract: z.string().nullable().optional(),
  })
  .passthrough();

const nextSchema = looseNumber.nullable().optional();

const searchResponseSchema = z
  .object({
    total: looseNumber.optional(),
    offset: looseNumber.optional(),
    next: nextSchema,
    data: z.array(rawPaperSchema),
  })
  .passthrough();

const referencesResponseSchema = z
  .object({
    offset: looseNumber.optional(),
    next: nextSchema,
    data: z.array(
      z
        .object({
          citedPaper: rawPaperSchema.nullable().optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

const citationsResponseSchema = z
  .object({
    offset: looseNumber.optional(),
    next: nextSchema,
    data: z.array(
      z
        .object({
          citingPaper: rawPaperSchema.nullable().optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

const recommendationsResponseSchema = z
  .object({
    offset: looseNumber.optional(),
    next: nextSchema,
    recommendedPapers: z.array(rawPaperSchema),
  })
  .passthrough();

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function toId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function toNext(value: unknown): number | null {
  const number = toNumber(value);
  if (number === null || number < 0) return null;
  return Math.floor(number);
}

export function normalizeS2Paper(
  raw: z.infer<typeof rawPaperSchema>,
  fetchedAt: string,
): Paper | null {
  const externalIds: Paper["externalIds"] = {};
  const rawExternal = raw.externalIds ?? {};
  for (const [key, value] of Object.entries(rawExternal)) {
    if (typeof value !== "string" && typeof value !== "number") continue;
    const text = String(value).trim();
    if (!text) continue;
    if (key.toLowerCase() === "doi") externalIds.DOI = text;
    if (key.toLowerCase() === "arxiv") externalIds.ArXiv = text;
  }

  const paperId =
    toId(raw.paperId) ??
    (externalIds.DOI ? `DOI:${externalIds.DOI}` : null) ??
    (externalIds.ArXiv ? `ARXIV:${externalIds.ArXiv}` : null);
  if (!paperId) return null;

  const yearNumber = toNumber(raw.year);
  const authors = (raw.authors ?? [])
    .map((author) => {
      const name = author.name?.trim();
      if (!name) return null;
      return {
        id: toId(author.authorId),
        name,
      };
    })
    .filter((author): author is { id: string | null; name: string } =>
      Boolean(author),
    );

  return normalizePaper(
    {
      id: paperId,
      title: raw.title ?? "",
      authors,
      year: yearNumber !== null ? Math.trunc(yearNumber) : null,
      venue: raw.venue ?? null,
      abstract: raw.abstract ?? null,
      citationCount: toNumber(raw.citationCount),
      referenceCount: toNumber(raw.referenceCount),
      url: raw.url ?? null,
      externalIds,
      source: "semantic-scholar",
      fetchedAt,
    },
    fetchedAt,
  );
}

export interface LiveSearchResult {
  papers: Paper[];
  nextOffset: number | null;
  fetchedAt: string;
}

export interface LiveBranch {
  papers: Paper[];
  receivedEntries: number;
  skippedEntries: number;
  nextOffset: number | null;
  requestedLimit: number;
}

export interface LiveRecommendationBranch {
  items: { paper: Paper; rank: number }[];
  receivedEntries: number;
  skippedEntries: number;
  nextOffset: number | null;
  requestedLimit: number;
}

export { canonicalizeIdentifier } from "@/lib/identifiers";
export type { CanonicalIdentifier, IdentifierKind } from "@/lib/identifiers";

interface RequestOptions {
  deadline: number;
  label: string;
}

function remainingMs(deadline: number): number {
  return deadline - Date.now();
}

async function fetchOnce(
  url: URL,
  options: RequestOptions,
): Promise<Response> {
  const config = getProviderConfig();
  const remaining = remainingMs(options.deadline);
  if (remaining <= 0) {
    throw new AppError(
      "UPSTREAM_TIMEOUT",
      "The neighborhood request exceeded its time budget. Please try again.",
      { retryable: true },
    );
  }
  const scheduler = getSharedScheduler(config.minIntervalMs);
  return scheduler.schedule(async () => {
    const budget = Math.min(
      config.timeoutMs,
      Math.max(1, remainingMs(options.deadline)),
    );
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (config.apiKey) headers["x-api-key"] = config.apiKey;

    let response: Response;
    try {
      response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(budget),
        cache: "no-store",
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      if (name === "TimeoutError" || name === "AbortError") {
        throw new AppError(
          "UPSTREAM_TIMEOUT",
          "Semantic Scholar did not respond in time. Please try again.",
          { retryable: true },
        );
      }
      throw new AppError(
        "PROVIDER_UNAVAILABLE",
        "Could not reach Semantic Scholar. Check the network or use the offline demo.",
        { retryable: true },
      );
    }

    if (response.ok) return response;

    const retryAfter = parseRetryAfterSeconds(
      response.headers.get("retry-after"),
    );
    if (response.status === 429) {
      const retryText =
        retryAfter !== null
          ? ` Try again in ${retryAfter} seconds.`
          : " Try again later.";
      const quotaText = config.apiKey
        ? "Semantic Scholar is rate limiting the configured API key."
        : "Live mode has no server-side API key and is using Semantic Scholar's shared unauthenticated quota.";
      throw new AppError(
        "RATE_LIMITED",
        `${quotaText}${retryText} Add SEMANTIC_SCHOLAR_API_KEY on the server, or use Stored snapshot mode for bundled real data.`,
        {
          retryAfterSeconds: retryAfter ?? undefined,
          retryable: true,
        },
      );
    }
    if (response.status === 404) {
      throw new AppError(
        "NOT_FOUND",
        `${options.label} was not found by Semantic Scholar.`,
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new AppError(
        "PROVIDER_CONFIGURATION",
        "Semantic Scholar rejected the server credentials. Check SEMANTIC_SCHOLAR_API_KEY.",
      );
    }
    if (response.status === 400) {
      throw new AppError(
        "PROVIDER_UNAVAILABLE",
        "Semantic Scholar rejected the request parameters.",
      );
    }
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      `Semantic Scholar returned an upstream error (HTTP ${response.status}) for ${options.label}.`,
      { retryable: response.status >= 500 },
    );
  });
}

async function requestJson<T>(
  url: URL,
  schema: z.ZodType<T>,
  options: RequestOptions,
): Promise<T> {
  const coalescer = getSharedCoalescer();
  const key = `${options.label}|${url.toString()}`;
  return coalescer.run(key, async () => {
    for (let attempt = 0; attempt <= 2; attempt += 1) {
      try {
        const response = await fetchOnce(url, options);
        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          throw new AppError(
            "INVALID_PROVIDER_RESPONSE",
            "Semantic Scholar returned a response that was not valid JSON.",
          );
        }
        const parsed = schema.safeParse(payload);
        if (!parsed.success) {
          throw new AppError(
            "INVALID_PROVIDER_RESPONSE",
            "Semantic Scholar returned an unexpected response shape.",
          );
        }
        return parsed.data;
      } catch (error) {
        const appError =
          error instanceof AppError
            ? error
            : new AppError(
                "PROVIDER_UNAVAILABLE",
                "Semantic Scholar request failed unexpectedly.",
                { retryable: true },
              );
        if (!appError.retryable || attempt >= 2) throw appError;

        const remaining = remainingMs(options.deadline);
        if (remaining <= 0) throw appError;
        const waitMs =
          appError.retryAfterSeconds !== undefined
            ? appError.retryAfterSeconds * 1000
            : retryBackoffMs(attempt);
        if (waitMs >= remaining) {
          if (appError.code === "RATE_LIMITED") {
            throw new AppError(
              "RATE_LIMITED",
              "Semantic Scholar asked this deployment to wait beyond the request budget. Use the offline demo or try later.",
              {
                retryAfterSeconds: appError.retryAfterSeconds,
                retryable: true,
              },
            );
          }
          throw appError;
        }
        await systemClock.sleep(waitMs);
      }
    }
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "Semantic Scholar request failed after retries.",
    );
  });
}

function graphUrl(pathname: string, fields: readonly string[], params: Record<string, string | number> = {}): URL {
  const url = new URL(`${GRAPH_BASE}${pathname}`);
  url.searchParams.set("fields", fields.join(","));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return url;
}

export async function searchLive(
  query: string,
  offset: number,
  deadline: number,
): Promise<LiveSearchResult> {
  const url = graphUrl("/paper/search", SEARCH_FIELDS, {
    query,
    limit: 10,
    offset,
  });
  const fetchedAt = new Date().toISOString();
  const payload = await requestJson(
    url,
    searchResponseSchema,
    { deadline, label: "Paper search" },
  );
  const papers = payload.data
    .map((raw) => normalizeS2Paper(raw, fetchedAt))
    .filter((paper): paper is Paper => Boolean(paper));
  return {
    papers,
    nextOffset: toNext(payload.next),
    fetchedAt,
  };
}

export async function getPaperLive(
  identifier: string,
  deadline: number,
): Promise<Paper> {
  const fetchedAt = new Date().toISOString();
  const url = graphUrl(
    `/paper/${encodeURIComponent(identifier)}`,
    PAPER_FIELDS,
  );
  const payload = await requestJson(
    url,
    rawPaperSchema,
    { deadline, label: "Paper lookup" },
  );
  const paper = normalizeS2Paper(payload, fetchedAt);
  if (!paper) {
    throw new AppError(
      "INVALID_PROVIDER_RESPONSE",
      "Semantic Scholar returned a paper without a usable identifier.",
    );
  }
  return paper;
}

async function getCitationBranch(
  centerId: string,
  direction: "references" | "citations",
  deadline: number,
): Promise<LiveBranch> {
  const limit = 40;
  const url = graphUrl(
    `/paper/${encodeURIComponent(centerId)}/${direction}`,
    SEARCH_FIELDS,
    { limit, offset: 0 },
  );
  const fetchedAt = new Date().toISOString();
  const schema =
    direction === "references"
      ? referencesResponseSchema
      : citationsResponseSchema;
  const payload = await requestJson(url, schema, {
    deadline,
    label: direction === "references" ? "References" : "Citing papers",
  });
  const entries = payload.data;
  const papers: Paper[] = [];
  let skippedEntries = 0;
  for (const entry of entries) {
    const raw =
      direction === "references"
        ? (entry as { citedPaper?: unknown }).citedPaper
        : (entry as { citingPaper?: unknown }).citingPaper;
    if (!raw) {
      skippedEntries += 1;
      continue;
    }
    const parsedRaw = rawPaperSchema.safeParse(raw);
    if (!parsedRaw.success) {
      skippedEntries += 1;
      continue;
    }
    const paper = normalizeS2Paper(parsedRaw.data, fetchedAt);
    if (!paper) {
      skippedEntries += 1;
      continue;
    }
    papers.push(paper);
  }
  return {
    papers,
    receivedEntries: entries.length,
    skippedEntries,
    nextOffset: toNext(payload.next),
    requestedLimit: limit,
  };
}

export function getReferencesLive(
  centerId: string,
  deadline: number,
): Promise<LiveBranch> {
  return getCitationBranch(centerId, "references", deadline);
}

export function getCitingLive(
  centerId: string,
  deadline: number,
): Promise<LiveBranch> {
  return getCitationBranch(centerId, "citations", deadline);
}

export async function getRecommendationsLive(
  centerId: string,
  pool: RecommendationPool,
  deadline: number,
): Promise<LiveRecommendationBranch> {
  const limit = 20;
  const url = new URL(
    `${RECOMMENDATIONS_BASE}/papers/forpaper/${encodeURIComponent(centerId)}`,
  );
  url.searchParams.set("from", pool);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fields", PAPER_FIELDS.join(","));
  const fetchedAt = new Date().toISOString();
  const payload = await requestJson(
    url,
    recommendationsResponseSchema,
    { deadline, label: "Recommendations" },
  );
  const items: { paper: Paper; rank: number }[] = [];
  let skippedEntries = 0;
  payload.recommendedPapers.forEach((raw, index) => {
    const paper = normalizeS2Paper(raw, fetchedAt);
    if (!paper) {
      skippedEntries += 1;
      return;
    }
    items.push({ paper, rank: index + 1 });
  });
  return {
    items,
    receivedEntries: payload.recommendedPapers.length,
    skippedEntries,
    nextOffset: toNext(payload.next),
    requestedLimit: limit,
  };
}

export async function resolveLive(
  identifier: CanonicalIdentifier,
  deadline: number,
): Promise<Paper> {
  if (identifier.kind === "query") {
    const search = await searchLive(identifier.value, 0, deadline);
    const top = search.papers[0];
    if (!top) {
      throw new AppError(
        "NOT_FOUND",
        "No paper matched that search. Try a more specific title or an identifier.",
      );
    }
    return top;
  }
  return getPaperLive(identifier.value, deadline);
}

/** Search cache key helper used by providers/index.ts. */
export function searchCacheKey(query: string, offset: number): string {
  return buildCacheKey(
    "semantic-scholar",
    "paper-search",
    { query: query.trim().toLowerCase(), offset },
    SEARCH_FIELDS,
    SCHEMA_VERSION,
  );
}

export const SEMANTIC_SCHOLAR_SEARCH_TTL = CACHE_TTL.search;
export const SEMANTIC_SCHOLAR_CACHE_NAME = "semantic-scholar";

export function getSemanticScholarCache<T>(name: string) {
  return getCache<T>(name);
}
