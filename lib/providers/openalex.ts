import { z } from "zod";
import type { Neighborhood, Paper, RecommendationPool } from "@/lib/types";
import type { CanonicalIdentifier } from "@/lib/identifiers";
import {
  assembleNeighborhood,
  type BranchData,
  type RecommendationData,
} from "@/lib/graph/normalize";
import { AppError } from "@/lib/server/errors";

/**
 * OpenAlex live provider.
 *
 * OpenAlex is a key-free, CORS-enabled scholarly graph. It is the live provider
 * for the public deployment because Semantic Scholar's free key is frequently
 * rate-limited. This module is isomorphic: the server routes and the static
 * GitHub Pages bridge both use the same pure request/normalization code.
 */

const OPENALEX_BASE = "https://api.openalex.org";
const REQUEST_TIMEOUT_MS = 20_000;
const SEARCH_LIMIT = 10;
const BRANCH_LIMIT = 40;
const RECOMMENDATION_LIMIT = 20;

const PAPER_SELECT = [
  "id",
  "doi",
  "display_name",
  "publication_year",
  "authorships",
  "primary_location",
  "cited_by_count",
  "referenced_works",
  "referenced_works_count",
  "related_works",
  "abstract_inverted_index",
  "ids",
].join(",");

const NEIGHBOR_SELECT = [
  "id",
  "doi",
  "display_name",
  "publication_year",
  "authorships",
  "primary_location",
  "cited_by_count",
  "referenced_works_count",
  "ids",
].join(",");

const SEARCH_SELECT = [
  "id",
  "doi",
  "display_name",
  "publication_year",
  "authorships",
  "primary_location",
  "cited_by_count",
  "referenced_works_count",
  "ids",
].join(",");

const workSchema = z
  .object({
    id: z.string(),
    doi: z.string().nullable().optional(),
    display_name: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    publication_year: z.number().nullable().optional(),
    authorships: z
      .array(
        z
          .object({
            author: z
              .object({
                id: z.string().nullable().optional(),
                display_name: z.string().nullable().optional(),
              })
              .passthrough()
              .nullable()
              .optional(),
          })
          .passthrough(),
      )
      .nullable()
      .optional(),
    primary_location: z
      .object({
        landing_page_url: z.string().nullable().optional(),
        source: z
          .object({
            display_name: z.string().nullable().optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    cited_by_count: z.number().nullable().optional(),
    referenced_works: z.array(z.string()).nullable().optional(),
    referenced_works_count: z.number().nullable().optional(),
    related_works: z.array(z.string()).nullable().optional(),
    abstract_inverted_index: z
      .record(z.string(), z.array(z.number()))
      .nullable()
      .optional(),
    ids: z.record(z.string(), z.string()).nullable().optional(),
  })
  .passthrough();

const worksResponseSchema = z
  .object({
    meta: z
      .object({
        count: z.number().optional(),
        page: z.number().optional(),
        per_page: z.number().optional(),
      })
      .passthrough()
      .optional(),
    results: z.array(workSchema),
  })
  .passthrough();

type OpenAlexWork = z.infer<typeof workSchema>;

export interface OpenAlexSearchResult {
  papers: Paper[];
  nextOffset: number | null;
  fetchedAt: string;
}

export interface OpenAlexBranch {
  papers: Paper[];
  receivedEntries: number;
  skippedEntries: number;
  nextOffset: number | null;
  requestedLimit: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms));
  });
}

function openAlexUrl(
  pathname: string,
  params: Record<string, string | number> = {},
): URL {
  const url = new URL(`${OPENALEX_BASE}${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return url;
}

async function requestWorks(
  url: URL,
  label: string,
): Promise<z.infer<typeof worksResponseSchema>> {
  let response: Response | undefined;
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await fetch(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await sleep(1_200 * (attempt + 1));
        continue;
      }
      throw new AppError(
        "PROVIDER_UNAVAILABLE",
        `Could not reach OpenAlex for ${label}. Check the network and try again.`,
        { retryable: true },
      );
    }

    if (response.ok) break;
    if (
      (response.status === 429 ||
        response.status === 500 ||
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504) &&
      attempt < 2
    ) {
      await sleep(1_200 * (attempt + 1));
      continue;
    }
    if (response.status === 429) {
      throw new AppError(
        "RATE_LIMITED",
        "OpenAlex is rate limiting requests. Try again shortly.",
        { retryable: true },
      );
    }
    if (response.status === 404) {
      throw new AppError("NOT_FOUND", `${label} was not found in OpenAlex.`);
    }
    if (response.status === 400) {
      throw new AppError(
        "PROVIDER_UNAVAILABLE",
        "OpenAlex rejected the request parameters.",
      );
    }
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      `OpenAlex returned an upstream error (HTTP ${response.status}) for ${label}.`,
      { retryable: response.status >= 500 },
    );
  }

  if (!response) {
    throw lastError instanceof AppError
      ? lastError
      : new AppError(
          "PROVIDER_UNAVAILABLE",
          `OpenAlex did not return a response for ${label}.`,
          { retryable: true },
        );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AppError(
      "INVALID_PROVIDER_RESPONSE",
      "OpenAlex returned a response that was not valid JSON.",
    );
  }
  const parsed = worksResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(
      "INVALID_PROVIDER_RESPONSE",
      "OpenAlex returned an unexpected response shape.",
    );
  }
  return parsed.data;
}

function shortOpenAlexId(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/(W\d+)\s*$/i);
  return match ? match[1].toUpperCase() : null;
}

function shortAuthorId(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/(A\d+)\s*$/i);
  return match ? match[1].toUpperCase() : null;
}

function abstractFromIndex(
  index: Record<string, number[]> | null | undefined,
): string | null {
  if (!index) return null;
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions) {
      if (Number.isInteger(position) && position >= 0 && position < 100_000) {
        words[position] = word;
      }
    }
  }
  const abstract = words.filter(Boolean).join(" ").trim();
  return abstract ? abstract.slice(0, 100_000) : null;
}

function normalizeDoi(doi: string | null | undefined): string | null {
  if (!doi) return null;
  return doi
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .replace(/^doi:/i, "")
    .trim();
}

function arxivFromDoi(doi: string | null): string | null {
  if (!doi) return null;
  const match = doi.match(/^10\.48550\/arxiv\.(.+)$/i);
  return match ? match[1] : null;
}

export function normalizeOpenAlexWork(
  raw: OpenAlexWork,
  fetchedAt: string,
): Paper | null {
  const id = shortOpenAlexId(raw.id);
  if (!id) return null;

  const authors = (raw.authorships ?? [])
    .map((authorship) => {
      const author = authorship.author;
      const name = author?.display_name?.trim();
      if (!name) return null;
      return { id: shortAuthorId(author?.id), name };
    })
    .filter((author): author is { id: string | null; name: string } =>
      Boolean(author),
    );

  const doi = normalizeDoi(raw.doi);
  const externalIds: Paper["externalIds"] = {};
  if (doi) externalIds.DOI = doi;
  const arxiv = arxivFromDoi(doi);
  if (arxiv) externalIds.ArXiv = arxiv;

  const venue =
    raw.primary_location?.source?.display_name?.trim() || null;
  const landing = raw.primary_location?.landing_page_url?.trim() || null;
  const url = doi
    ? `https://doi.org/${doi}`
    : landing || `https://openalex.org/${id}`;

  const referencedWorks = raw.referenced_works ?? [];
  const referenceCount =
    typeof raw.referenced_works_count === "number"
      ? raw.referenced_works_count
      : referencedWorks.length;

  return {
    id,
    title: (raw.display_name ?? raw.title ?? "").trim(),
    authors,
    year:
      typeof raw.publication_year === "number"
        ? Math.trunc(raw.publication_year)
        : null,
    venue,
    abstract: abstractFromIndex(raw.abstract_inverted_index),
    citationCount:
      typeof raw.cited_by_count === "number" ? raw.cited_by_count : null,
    referenceCount,
    url,
    externalIds,
    source: "openalex",
    fetchedAt,
  };
}

function resultFromWorks(
  results: OpenAlexWork[],
  fetchedAt: string,
): Paper[] {
  return results
    .map((work) => normalizeOpenAlexWork(work, fetchedAt))
    .filter((paper): paper is Paper => Boolean(paper));
}

export async function searchOpenAlex(
  query: string,
  offset: number,
  limit = SEARCH_LIMIT,
): Promise<OpenAlexSearchResult> {
  const page = Math.floor(Math.max(0, offset) / limit) + 1;
  const url = openAlexUrl("/works", {
    search: query,
    "per-page": limit,
    page,
    select: SEARCH_SELECT,
  });
  const fetchedAt = new Date().toISOString();
  const payload = await requestWorks(url, "Paper search");
  const papers = resultFromWorks(payload.results, fetchedAt);
  const count = payload.meta?.count ?? 0;
  const consumed = (page - 1) * limit + payload.results.length;
  return {
    papers,
    nextOffset:
      payload.results.length > 0 && consumed < count ? page * limit : null,
    fetchedAt,
  };
}

async function getWorkByDoi(
  doi: string,
  fetchedAt: string,
): Promise<Paper | null> {
  const url = openAlexUrl("/works", {
    filter: `doi:${doi}`,
    "per-page": 1,
    select: PAPER_SELECT,
  });
  const payload = await requestWorks(url, "DOI lookup");
  return resultFromWorks(payload.results, fetchedAt)[0] ?? null;
}

async function getWorkById(
  id: string,
  fetchedAt: string,
): Promise<Paper | null> {
  const url = openAlexUrl("/works", {
    filter: `openalex_id:${id}`,
    "per-page": 1,
    select: PAPER_SELECT,
  });
  const payload = await requestWorks(url, "Paper lookup");
  return resultFromWorks(payload.results, fetchedAt)[0] ?? null;
}

export async function getOpenAlexPaper(
  identifier: string,
  fetchedAt = new Date().toISOString(),
): Promise<Paper> {
  const trimmed = identifier.trim();
  const workId = shortOpenAlexId(trimmed);
  let paper: Paper | null = null;
  if (workId) {
    paper = await getWorkById(workId, fetchedAt);
  } else if (/^(?:DOI:)?10\.\d{4,9}\/\S+$/i.test(trimmed)) {
    paper = await getWorkByDoi(
      normalizeDoi(trimmed.replace(/^DOI:/i, "")) ?? trimmed,
      fetchedAt,
    );
  } else if (/^(?:ARXIV:)?\d{4}\.\d{4,5}(?:v\d+)?$/i.test(trimmed)) {
    const arxiv = trimmed.replace(/^ARXIV:/i, "");
    paper = await getWorkByDoi(
      `10.48550/arxiv.${arxiv.toLowerCase()}`,
      fetchedAt,
    );
    if (!paper) {
      const search = await searchOpenAlex(trimmed, 0, 1);
      paper = search.papers[0] ?? null;
    }
  } else {
    const search = await searchOpenAlex(trimmed, 0, 1);
    paper = search.papers[0] ?? null;
  }
  if (!paper) {
    throw new AppError(
      "NOT_FOUND",
      "OpenAlex did not find a matching paper. Try a title, DOI, or arXiv ID.",
    );
  }
  return paper;
}

export async function resolveOpenAlex(
  identifier: CanonicalIdentifier,
  fetchedAt = new Date().toISOString(),
): Promise<Paper> {
  if (identifier.kind === "query") {
    const value = identifier.value.trim();
    if (/^W\d+$/i.test(value)) {
      return getOpenAlexPaper(value, fetchedAt);
    }
    const search = await searchOpenAlex(value, 0, 1);
    const paper = search.papers[0];
    if (!paper) {
      throw new AppError(
        "NOT_FOUND",
        "No paper matched that search in OpenAlex. Try a more specific title or an identifier.",
      );
    }
    return paper;
  }
  if (identifier.kind === "doi") {
    const paper = await getWorkByDoi(
      normalizeDoi(identifier.value.replace(/^DOI:/i, "")) ??
        identifier.value,
      fetchedAt,
    );
    if (paper) return paper;
    throw new AppError("NOT_FOUND", "That DOI was not found in OpenAlex.");
  }
  if (identifier.kind === "arxiv") {
    return getOpenAlexPaper(identifier.value, fetchedAt);
  }
  // Semantic Scholar IDs are not OpenAlex IDs. Use the text as a last-resort
  // search rather than pretending the identifier resolved exactly.
  const search = await searchOpenAlex(identifier.value, 0, 1);
  const paper = search.papers[0];
  if (paper) return paper;
  throw new AppError(
    "NOT_FOUND",
    "OpenAlex could not resolve that identifier. Try a DOI or title.",
  );
}

async function fetchWorksByIds(
  ids: string[],
  limit: number,
  fetchedAt: string,
): Promise<OpenAlexBranch> {
  if (ids.length === 0) {
    return {
      papers: [],
      receivedEntries: 0,
      skippedEntries: 0,
      nextOffset: null,
      requestedLimit: limit,
    };
  }
  const requested = ids.slice(0, limit);
  const url = openAlexUrl("/works", {
    filter: `openalex_id:${requested.join("|")}`,
    "per-page": requested.length,
    select: NEIGHBOR_SELECT,
  });
  const payload = await requestWorks(url, "Related papers");
  const byId = new Map<string, OpenAlexWork>();
  for (const work of payload.results) {
    const id = shortOpenAlexId(work.id);
    if (id) byId.set(id, work);
  }
  const ordered = requested
    .map((id) => byId.get(id))
    .filter((work): work is OpenAlexWork => Boolean(work));
  const papers = resultFromWorks(ordered, fetchedAt);
  return {
    papers,
    receivedEntries: requested.length,
    skippedEntries: requested.length - papers.length,
    nextOffset: ids.length > requested.length ? requested.length : null,
    requestedLimit: limit,
  };
}

async function fetchCitingWorks(
  centerId: string,
  fetchedAt: string,
): Promise<OpenAlexBranch> {
  const url = openAlexUrl("/works", {
    filter: `cites:${centerId}`,
    "per-page": BRANCH_LIMIT,
    select: NEIGHBOR_SELECT,
  });
  const payload = await requestWorks(url, "Citing papers");
  const papers = resultFromWorks(payload.results, fetchedAt);
  const count = payload.meta?.count ?? payload.results.length;
  return {
    papers,
    receivedEntries: payload.results.length,
    skippedEntries: payload.results.length - papers.length,
    nextOffset: payload.results.length < count ? payload.results.length : null,
    requestedLimit: BRANCH_LIMIT,
  };
}

export async function getOpenAlexNeighborhood(
  paperId: string,
  recommendationPool: RecommendationPool = "all-cs",
): Promise<Neighborhood> {
  const fetchedAt = new Date().toISOString();
  const workId = shortOpenAlexId(paperId) ?? paperId.replace(/^DOI:/i, "");
  const centerUrl = openAlexUrl("/works", {
    filter: workId.startsWith("W")
      ? `openalex_id:${workId}`
      : `doi:${normalizeDoi(workId) ?? workId}`,
    "per-page": 1,
    select: PAPER_SELECT,
  });
  const centerPayload = await requestWorks(centerUrl, "Center paper");
  const centerRaw = centerPayload.results[0];
  const center = centerRaw
    ? normalizeOpenAlexWork(centerRaw, fetchedAt)
    : null;
  if (!centerRaw || !center) {
    throw new AppError("NOT_FOUND", "That paper was not found in OpenAlex.");
  }

  const referenceIds = (centerRaw.referenced_works ?? [])
    .map((id) => shortOpenAlexId(id))
    .filter((id): id is string => Boolean(id));
  const relatedIds = (centerRaw.related_works ?? [])
    .map((id) => shortOpenAlexId(id))
    .filter((id): id is string => Boolean(id));

  const [referencesResult, citingResult, recommendedResult] =
    await Promise.allSettled([
      fetchWorksByIds(referenceIds, BRANCH_LIMIT, fetchedAt),
      fetchCitingWorks(center.id, fetchedAt),
      fetchWorksByIds(relatedIds, RECOMMENDATION_LIMIT, fetchedAt),
    ]);

  function emptyBranch(
    requestedLimit: number,
    error: unknown,
    label: string,
  ): BranchData {
    const code = error instanceof AppError ? error.code : "PROVIDER_UNAVAILABLE";
    return {
      papers: [],
      receivedEntries: 0,
      skippedEntries: 0,
      requestedLimit,
      nextOffset: null,
      status: code === "NOT_FOUND" ? "unavailable" : "error",
      message:
        error instanceof AppError
          ? error.message
          : `OpenAlex could not load ${label.toLowerCase()}.`,
    };
  }

  const references =
    referencesResult.status === "fulfilled"
      ? referencesResult.value
      : emptyBranch(BRANCH_LIMIT, referencesResult.reason, "references");
  const citing =
    citingResult.status === "fulfilled"
      ? citingResult.value
      : emptyBranch(BRANCH_LIMIT, citingResult.reason, "citing papers");
  const recommendedBranch =
    recommendedResult.status === "fulfilled"
      ? recommendedResult.value
      : emptyBranch(
          RECOMMENDATION_LIMIT,
          recommendedResult.reason,
          "related works",
        );

  const recommended: RecommendationData = {
    items: recommendedBranch.papers.map((paper, index) => ({
      paper,
      rank: index + 1,
    })),
    receivedEntries: recommendedBranch.receivedEntries,
    skippedEntries: recommendedBranch.skippedEntries,
    requestedLimit: recommendedBranch.requestedLimit,
    nextOffset: recommendedBranch.nextOffset,
  };

  return assembleNeighborhood({
    center,
    references,
    citing,
    recommended,
    mode: "live",
    provider: "openalex",
    fetchedAt,
    recommendationPool,
    warnings: [
      "This is a bounded live sample: up to 40 references, 40 citing papers, and 20 related works. It is not a complete citation graph.",
      "OpenAlex related works are algorithmic associations, not quality-ranked recommendations. Provider citation totals and retrieved neighbor counts are shown separately in Data info.",
    ],
  });
}
