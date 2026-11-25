import { z } from "zod";
import type { Paper } from "@/lib/types";
import { normalizePaper } from "@/lib/graph/normalize";

/**
 * Pure Semantic Scholar request/response primitives shared by the server
 * provider and the browser-only static live mode. Nothing here reads secrets
 * or touches the filesystem, so it is safe in a client bundle.
 */

export const GRAPH_BASE = "https://api.semanticscholar.org/graph/v1";
export const RECOMMENDATIONS_BASE =
  "https://api.semanticscholar.org/recommendations/v1";

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

export const searchResponseSchema = z
  .object({
    total: looseNumber.optional(),
    offset: looseNumber.optional(),
    next: nextSchema,
    data: z.array(rawPaperSchema),
  })
  .passthrough();

export const referencesResponseSchema = z
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

export const citationsResponseSchema = z
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

export const recommendationsResponseSchema = z
  .object({
    offset: looseNumber.optional(),
    next: nextSchema,
    recommendedPapers: z.array(rawPaperSchema),
  })
  .passthrough();

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function toId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function toNext(value: unknown): number | null {
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

export function graphUrl(
  pathname: string,
  fields: readonly string[],
  params: Record<string, string | number> = {},
): URL {
  const url = new URL(`${GRAPH_BASE}${pathname}`);
  url.searchParams.set("fields", fields.join(","));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return url;
}

export function recommendationsUrl(
  centerId: string,
  pool: "recent" | "all-cs",
  fields: readonly string[],
  limit: number,
): URL {
  const url = new URL(
    `${RECOMMENDATIONS_BASE}/papers/forpaper/${encodeURIComponent(centerId)}`,
  );
  url.searchParams.set("from", pool);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fields", fields.join(","));
  return url;
}
