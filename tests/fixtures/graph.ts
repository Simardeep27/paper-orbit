import type {
  BranchStatus,
  Membership,
  Neighborhood,
  Paper,
  RecommendationPool,
} from "@/lib/types";
import { buildNeighborhood } from "@/lib/graph/build";
import type {
  BranchData,
  RecommendationData,
} from "@/lib/graph/normalize";

export const FIXED_NOW = "2026-10-20T12:00:00.000Z";

export function makePaper(
  id: string,
  overrides: Partial<Paper> = {},
): Paper {
  return {
    id,
    title: `Paper ${id} about citation visualization`,
    authors: [{ id: `author-${id}`, name: `Author ${id}` }],
    year: 2020,
    venue: "Test Venue",
    abstract:
      "We study citation neighborhoods, paper lists, and interactive visualization.",
    citationCount: 10,
    referenceCount: 5,
    url: `https://example.org/paper/${id}`,
    externalIds: {},
    source: "synthetic-test",
    fetchedAt: FIXED_NOW,
    ...overrides,
  };
}

export interface BranchOptions {
  status?: BranchStatus;
  requestedLimit?: number;
  receivedEntries?: number;
  skippedEntries?: number;
  nextOffset?: number | null;
  message?: string;
}

export function branch(
  papers: Paper[],
  options: BranchOptions = {},
): BranchData {
  return {
    papers,
    receivedEntries: options.receivedEntries ?? papers.length,
    skippedEntries: options.skippedEntries ?? 0,
    requestedLimit: options.requestedLimit ?? 40,
    nextOffset: options.nextOffset ?? null,
    status:
      options.status && options.status !== "empty"
        ? options.status
        : undefined,
    message: options.message,
  };
}

export function recommendationBranch(
  papers: Paper[],
  options: BranchOptions = {},
): RecommendationData {
  return {
    items: papers.map((paper, index) => ({ paper, rank: index + 1 })),
    receivedEntries: options.receivedEntries ?? papers.length,
    skippedEntries: options.skippedEntries ?? 0,
    requestedLimit: options.requestedLimit ?? 20,
    nextOffset: options.nextOffset ?? null,
    status:
      options.status && options.status !== "empty"
        ? options.status
        : undefined,
    message: options.message,
  };
}

export interface BuildFixtureOptions {
  center?: Paper;
  references?: Paper[];
  citing?: Paper[];
  recommended?: Paper[];
  referenceOptions?: BranchOptions;
  citingOptions?: BranchOptions;
  recommendationOptions?: BranchOptions;
  memberships?: Record<string, Membership[]>;
  pool?: RecommendationPool;
}

export function makeNeighborhood(
  options: BuildFixtureOptions = {},
): Neighborhood {
  const center = options.center ?? makePaper("center");
  return buildNeighborhood({
    center,
    references: branch(options.references ?? [], options.referenceOptions),
    citing: branch(options.citing ?? [], options.citingOptions),
    recommended: recommendationBranch(
      options.recommended ?? [],
      options.recommendationOptions,
    ),
    mode: "synthetic-demo",
    provider: "synthetic-test",
    fetchedAt: FIXED_NOW,
    recommendationPool: options.pool ?? "all-cs",
    similarityComputedAt: FIXED_NOW,
    warnings: [],
    demo: {
      availableCenterIds: ["center"],
      notice: "Test fixture",
    },
  });
}

export function yearNeighborhood(): Neighborhood {
  return makeNeighborhood({
    center: makePaper("center", { year: 2010, title: "Center paper" }),
    references: [
      makePaper("old", { year: 1999, citationCount: 0 }),
      makePaper("same", { year: 2005, citationCount: 3 }),
      makePaper("new", { year: 2020, citationCount: null }),
      makePaper("unknown-year", { year: null, citationCount: 8 }),
    ],
    citing: [makePaper("later", { year: 2024, citationCount: 1 })],
    recommended: [
      makePaper("rec-a", { year: 2015, citationCount: null }),
      makePaper("rec-b", { year: 2018, citationCount: 2 }),
    ],
  });
}
