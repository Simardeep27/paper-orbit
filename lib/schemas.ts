import { z } from "zod";

const nonNegativeInt = z
  .number()
  .int()
  .nonnegative()
  .nullable();

export const paperSchema = z.object({
  id: z.string().min(1).max(512),
  title: z.string().min(1).max(2000),
  authors: z
    .array(
      z.object({
        id: z.string().max(512).nullable(),
        name: z.string().min(1).max(500),
      }),
    )
    .max(500),
  year: z.number().int().min(1000).max(3000).nullable(),
  venue: z.string().max(1000).nullable(),
  abstract: z.string().max(100_000).nullable(),
  citationCount: nonNegativeInt,
  referenceCount: nonNegativeInt,
  url: z.string().max(2048).nullable(),
  externalIds: z
    .object({
      DOI: z.string().max(512).optional(),
      ArXiv: z.string().max(512).optional(),
    })
    .default({}),
  source: z.enum(["semantic-scholar", "synthetic-test"]),
  fetchedAt: z.string().min(1).max(64),
});

export const membershipSchema = z.enum([
  "reference",
  "citing",
  "recommended",
]);

export const orbitNodeSchema = z.object({
  paper: paperSchema,
  memberships: z.array(membershipSchema).max(3),
  recommendationRank: z.number().int().positive().nullable(),
  textSimilarity: z.number().min(0).max(1).nullable(),
  similarityCoverage: z.enum([
    "title+abstract",
    "title-only",
    "unavailable",
  ]),
});

export const citationEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  kind: z.literal("citation"),
  evidence: z.enum(["references-endpoint", "citations-endpoint"]),
});

export const recommendationLinkSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  kind: z.literal("recommendation"),
  pool: z.enum(["recent", "all-cs"]),
  rank: z.number().int().positive(),
});

export const branchCoverageSchema = z.object({
  status: z.enum(["ok", "empty", "error", "unavailable"]),
  requestedLimit: z.number().int().nonnegative(),
  receivedEntries: z.number().int().nonnegative(),
  validDistinctPapers: z.number().int().nonnegative(),
  skippedEntries: z.number().int().nonnegative(),
  nextOffset: z.number().int().nonnegative().nullable(),
  message: z.string().max(2000).optional(),
});

export const similarityRunSchema = z.object({
  algorithm: z.literal("tfidf-cosine"),
  version: z.literal("1.0.0"),
  corpusIds: z.array(z.string()),
  computedAt: z.string(),
});

export const demoMetaSchema = z.object({
  availableCenterIds: z.array(z.string()),
  notice: z.string(),
});

export const neighborhoodSchema = z.object({
  schemaVersion: z.literal(1),
  centerId: z.string().min(1),
  nodes: z.array(orbitNodeSchema).min(1).max(150),
  edges: z.array(citationEdgeSchema),
  recommendations: z.array(recommendationLinkSchema),
  mode: z.enum(["live", "snapshot", "synthetic-demo"]),
  provider: z.enum(["semantic-scholar", "synthetic-test"]),
  fetchedAt: z.string(),
  recommendationPool: z.enum(["recent", "all-cs"]),
  coverage: z.object({
    references: branchCoverageSchema,
    citing: branchCoverageSchema,
    recommended: branchCoverageSchema,
  }),
  warnings: z.array(z.string()),
  similarity: similarityRunSchema,
  demo: demoMetaSchema.optional(),
  offline: demoMetaSchema.optional(),
});

export const savedPaperSchema = z.object({
  paper: paperSchema,
  note: z.string().max(10_000),
  savedAt: z.string(),
  sourceCenterId: z.string().nullable(),
  sourceCenterTitle: z.string().nullable(),
});

export const readingListDocumentSchema = z.object({
  version: z.literal(1),
  items: z.array(savedPaperSchema).max(2000),
});

const modeSchema = z.enum(["live", "demo", "snapshot"]).default("live");
const offsetSchema = z.coerce.number().int().min(0).max(1000).default(0);

export const searchRequestSchema = z.object({
  q: z.string().trim().min(2).max(300),
  offset: offsetSchema,
  mode: modeSchema,
});

/** Rejects URL-like and whitespace-containing canonical IDs. */
export const canonicalIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .regex(/^[A-Za-z0-9:._\-/]+$/, "Invalid paper identifier")
  .refine((value) => !/^https?:\/\//i.test(value), "URLs are not accepted");

export const resolveRequestSchema = z.object({
  id: z.string().trim().min(1).max(512),
  mode: modeSchema,
});

export const neighborhoodRequestSchema = z.object({
  paperId: canonicalIdSchema,
  mode: modeSchema,
});

export const filtersSchema = z.object({
  relationships: z.array(membershipSchema).max(3),
  yearStart: z.number().int().min(1000).max(3000).nullable(),
  yearEnd: z.number().int().min(1000).max(3000).nullable(),
  includeUnknownYear: z.boolean(),
  minCitations: z.number().int().nonnegative(),
  includeUnknownCitations: z.boolean(),
  minSimilarity: z.number().min(0).max(1),
  includeUnavailableSimilarity: z.boolean(),
  text: z.string().max(300),
});

export function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input.";
  const path = issue.path.length ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}
