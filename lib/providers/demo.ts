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
    mode: z.string(),
    provider: z.string(),
    nodeCount: z.number().int(),
    neighborCount: z.number().int(),
    relationships: z.object({
      references: z.number().int(),
      citing: z.number().int(),
      recommended: z.number().int(),
    }),
    fetchedAt: z.string(),
  })
  .passthrough();

const manifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: z.string(),
    provider: z.literal("synthetic-test"),
    notice: z.string(),
    availableCenterIds: z.array(z.string()),
    provenance: z
      .object({
        kind: z.string(),
        label: z.string(),
        description: z.string(),
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
  })
  .passthrough();

export type DemoManifest = z.infer<typeof manifestSchema>;

const DEMO_ROOT = path.join(process.cwd(), "data", "demo");
const MANIFEST_PATH = path.join(DEMO_ROOT, "manifest.json");

export class DemoUnavailableError extends Error {
  constructor(message = "Offline demo data is not available.") {
    super(message);
    this.name = "DemoUnavailableError";
  }
}

export class DemoCenterUnavailableError extends Error {
  readonly catalogPaper: Paper | null;

  constructor(paperId: string, catalogPaper: Paper | null) {
    super(
      `This paper's neighborhood is not included in the offline demo. ${
        catalogPaper
          ? `"${catalogPaper.title}" appears in the local catalog and can be inspected from a loaded neighborhood, but no stored neighborhood exists for it.`
          : "The paper is not part of the offline demo catalog."
      }`,
    );
    this.name = "DemoCenterUnavailableError";
    this.catalogPaper = catalogPaper;
  }
}

let cachedManifest: DemoManifest | null = null;

export async function isDemoAvailable(): Promise<boolean> {
  try {
    await access(MANIFEST_PATH);
    return true;
  } catch {
    return false;
  }
}

export async function loadDemoManifest(): Promise<DemoManifest> {
  if (cachedManifest) return cachedManifest;
  let raw: string;
  try {
    raw = await readFile(MANIFEST_PATH, "utf8");
  } catch {
    throw new DemoUnavailableError(
      "Offline demo data is missing. Run npm run demo:synthetic to generate the demo fixtures.",
    );
  }
  const parsed = manifestSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new DemoUnavailableError(
      "Offline demo manifest is malformed. Regenerate it with npm run demo:synthetic.",
    );
  }
  cachedManifest = parsed.data;
  return cachedManifest;
}

export function resetDemoManifestCache() {
  cachedManifest = null;
}

export async function searchDemoCatalog(
  query: string,
  offset: number,
  limit = 10,
): Promise<SearchResultSet> {
  const manifest = await loadDemoManifest();
  const page = searchCatalog(manifest.catalog, query, offset, limit);
  return {
    ...page,
    sourceMode: "demo",
    fetchedAt: manifest.generatedAt,
    demoAvailableCenterIds: manifest.availableCenterIds,
  };
}

export async function getDemoCatalogPaper(id: string): Promise<Paper | null> {
  const manifest = await loadDemoManifest();
  const entry = manifest.catalog.find((item) => item.paper.id === id.trim());
  return entry?.paper ?? null;
}

export async function resolveDemoPaper(id: string): Promise<Paper | null> {
  return getDemoCatalogPaper(id);
}

export async function getDemoNeighborhood(
  centerId: string,
): Promise<Neighborhood> {
  const manifest = await loadDemoManifest();
  const center = manifest.centers.find((entry) => entry.id === centerId);
  if (!center) {
    const catalogPaper = await getDemoCatalogPaper(centerId);
    throw new DemoCenterUnavailableError(centerId, catalogPaper);
  }
  let raw: string;
  try {
    raw = await readFile(path.join(DEMO_ROOT, center.file), "utf8");
  } catch {
    throw new DemoUnavailableError(
      `Stored neighborhood file is missing for ${centerId}. Regenerate the demo fixtures.`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new DemoUnavailableError(
      `Stored neighborhood file for ${centerId} is not valid JSON.`,
    );
  }
  const neighborhood = parseNeighborhoodFixture(parsed);
  if (neighborhood.centerId !== centerId) {
    throw new DemoUnavailableError(
      `Stored neighborhood for ${centerId} has a mismatched center.`,
    );
  }
  if (!neighborhood.demo) {
    neighborhood.demo = {
      availableCenterIds: manifest.availableCenterIds,
      notice:
        "Synthetic interaction demo. This offline neighborhood is fictional.",
    };
  }
  return neighborhood;
}

export async function getDemoCenterIds(): Promise<string[]> {
  const manifest = await loadDemoManifest();
  return manifest.availableCenterIds;
}
