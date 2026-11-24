import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Neighborhood, Paper, SearchResultSet } from "@/lib/types";
import { paperSchema } from "@/lib/schemas";
import { parseNeighborhoodFixture } from "@/lib/graph/build";
import { searchCatalog } from "@/lib/providers/catalog";

const centerEntrySchema = z
  .object({
    id: z.string(),
    title: z.string(),
    year: z.number().nullable(),
    venue: z.string().nullable(),
    file: z.string(),
    mode: z.literal("snapshot"),
    provider: z.literal("semantic-scholar"),
    nodeCount: z.number().int(),
    neighborCount: z.number().int(),
    relationships: z.object({
      references: z.number().int(),
      citing: z.number().int(),
      recommended: z.number().int(),
    }),
    fetchedAt: z.string(),
    recommendationPool: z.enum(["recent", "all-cs"]).optional(),
    sourceUrls: z.array(z.string()).optional(),
  })
  .passthrough();

const snapshotManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: z.string(),
    provider: z.literal("semantic-scholar"),
    notice: z.string(),
    attribution: z
      .object({
        api: z.string(),
        license: z.string(),
        requirement: z.string(),
      })
      .passthrough()
      .optional(),
    availableCenterIds: z.array(z.string()),
    provenance: z
      .object({
        kind: z.literal("semantic-scholar-snapshot"),
        label: z.string(),
        source: z.string(),
        retrievedAt: z.string(),
        schemaVersion: z.number(),
        recommendationPool: z.enum(["recent", "all-cs"]),
        completeness: z.string(),
      })
      .passthrough(),
    catalog: z.array(
      z.object({ paper: paperSchema, hasNeighborhood: z.boolean() }),
    ),
    centers: z.array(centerEntrySchema),
    errors: z.array(z.string()).optional(),
  })
  .passthrough();

export type SnapshotManifest = z.infer<typeof snapshotManifestSchema>;

const SNAPSHOT_ROOT = path.join(process.cwd(), "data", "snapshots");
const MANIFEST_PATH = path.join(SNAPSHOT_ROOT, "manifest.json");

export class SnapshotUnavailableError extends Error {
  constructor(message = "Stored snapshot data is not available.") {
    super(message);
    this.name = "SnapshotUnavailableError";
  }
}

export class SnapshotCenterUnavailableError extends Error {
  constructor(paperId: string) {
    super(
      `This paper's neighborhood is not included in the stored offline snapshot. No stored neighborhood exists for ${paperId}.`,
    );
    this.name = "SnapshotCenterUnavailableError";
  }
}

let cachedManifest: SnapshotManifest | null = null;

export async function isSnapshotAvailable(): Promise<boolean> {
  try {
    await access(MANIFEST_PATH);
    return true;
  } catch {
    return false;
  }
}

export async function loadSnapshotManifest(): Promise<SnapshotManifest> {
  if (cachedManifest) return cachedManifest;
  let raw: string;
  try {
    raw = await readFile(MANIFEST_PATH, "utf8");
  } catch {
    throw new SnapshotUnavailableError(
      "Stored snapshot data is missing. Run npm run demo:fetch -- --seed <identifier> to create it.",
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SnapshotUnavailableError(
      "Stored snapshot manifest is not valid JSON. Regenerate it with demo:fetch.",
    );
  }
  const result = snapshotManifestSchema.safeParse(parsed);
  if (!result.success) {
    throw new SnapshotUnavailableError(
      "Stored snapshot manifest is malformed. Regenerate it with demo:fetch.",
    );
  }
  cachedManifest = result.data;
  return cachedManifest;
}

export function resetSnapshotManifestCache() {
  cachedManifest = null;
}

export async function searchSnapshotCatalog(
  query: string,
  offset: number,
  limit = 10,
): Promise<SearchResultSet> {
  const manifest = await loadSnapshotManifest();
  const page = searchCatalog(manifest.catalog, query, offset, limit);
  return {
    ...page,
    sourceMode: "snapshot",
    fetchedAt: manifest.generatedAt,
    snapshotAvailableCenterIds: manifest.availableCenterIds,
  };
}

export async function resolveSnapshotPaper(id: string): Promise<Paper | null> {
  const manifest = await loadSnapshotManifest();
  const entry = manifest.catalog.find((item) => item.paper.id === id.trim());
  return entry?.paper ?? null;
}

export async function getSnapshotNeighborhood(
  centerId: string,
): Promise<Neighborhood> {
  const manifest = await loadSnapshotManifest();
  const center = manifest.centers.find((entry) => entry.id === centerId);
  if (!center) {
    throw new SnapshotCenterUnavailableError(centerId);
  }
  let raw: string;
  try {
    raw = await readFile(path.join(SNAPSHOT_ROOT, center.file), "utf8");
  } catch {
    throw new SnapshotUnavailableError(
      `Stored snapshot file is missing for ${centerId}. Regenerate it with demo:fetch.`,
    );
  }
  const possiblyNeighborhood = parseNeighborhoodFixture(JSON.parse(raw));
  if (possiblyNeighborhood.centerId !== centerId) {
    throw new SnapshotUnavailableError(
      `Stored snapshot for ${centerId} has a mismatched center.`,
    );
  }
  return {
    ...possiblyNeighborhood,
    mode: "snapshot",
    provider: "semantic-scholar",
    offline: {
      availableCenterIds: manifest.availableCenterIds,
      notice:
        "Stored Semantic Scholar snapshot. The neighborhood is a bounded sample, not a complete citation graph.",
    },
  };
}

export async function getSnapshotCenterIds(): Promise<string[]> {
  const manifest = await loadSnapshotManifest();
  return manifest.availableCenterIds;
}
