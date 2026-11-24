/**
 * Retrieves bounded, real Semantic Scholar neighborhoods and writes an
 * offline snapshot manifest. This is an opt-in, credentialed operation: it is
 * never run by the app, tests, or production build.
 *
 * Usage:
 *   npm run demo:fetch -- --seed "Attention Is All You Need"
 *   npm run demo:fetch -- --seed DOI:10.48550/arXiv.1706.03762 --seed <id>
 *
 * The script normalizes provider data through the same adapters as the live
 * route. It stores only normalized paper metadata and observed relationship
 * edges, never raw responses, full text, headers, or API keys.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getNeighborhood, resolvePaper } from "../lib/providers";
import { PAPER_FIELDS } from "../lib/providers/semantic-scholar";
import type { Neighborhood, Paper } from "../lib/types";

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_OUT = path.join(ROOT, "data", "snapshots");
const SCHEMA_VERSION = 1;
const MAX_LINKED_CENTERS = 3;

interface Options {
  seeds: string[];
  outDir: string;
  pool: "recent" | "all-cs";
  dryRun: boolean;
}

interface CenterEntry {
  id: string;
  title: string;
  year: number | null;
  venue: string | null;
  file: string;
  mode: "snapshot";
  provider: "semantic-scholar";
  nodeCount: number;
  neighborCount: number;
  relationships: {
    references: number;
    citing: number;
    recommended: number;
  };
  fetchedAt: string;
  recommendationPool: "recent" | "all-cs";
  sourceUrls: string[];
}

function usage(): never {
  console.error(
    [
      "Usage: npm run demo:fetch -- --seed <identifier> [--seed <identifier>] [options]",
      "",
      "Options:",
      "  --seed <identifier>  Title/keyword, DOI, arXiv ID, or Semantic Scholar ID. Repeatable.",
      "  --out <directory>    Output directory (default: data/snapshots).",
      "  --pool <recent|all-cs>  Recommendation pool (default: all-cs).",
      "  --dry-run            Fetch and validate, but write no files.",
      "  --help               Show this message.",
    ].join("\n"),
  );
  process.exit(2);
}

function parseArgs(argv: string[]): Options {
  const seeds: string[] = [];
  let outDir = DEFAULT_OUT;
  let pool: "recent" | "all-cs" = "all-cs";
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--seed") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) usage();
      seeds.push(value);
      index += 1;
    } else if (arg.startsWith("--seed=")) {
      seeds.push(arg.slice("--seed=".length));
    } else if (arg === "--out") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) usage();
      outDir = path.resolve(value);
      index += 1;
    } else if (arg === "--pool") {
      const value = argv[index + 1];
      if (value !== "recent" && value !== "all-cs") usage();
      pool = value;
      index += 1;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      usage();
    } else {
      console.error(`Unknown argument: ${arg}`);
      usage();
    }
  }

  if (seeds.length === 0) usage();
  return { seeds, outDir, pool, dryRun };
}

function safeFilename(id: string): string {
  return (
    id
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 120) || "paper"
  );
}

function sourceUrls(centerId: string, pool: "recent" | "all-cs"): string[] {
  const fields = PAPER_FIELDS.join(",");
  const encoded = encodeURIComponent(centerId);
  const graph = "https://api.semanticscholar.org/graph/v1";
  const recommendations =
    "https://api.semanticscholar.org/recommendations/v1";
  return [
    `${graph}/paper/${encoded}?fields=${fields}`,
    `${graph}/paper/${encoded}/references?limit=40&offset=0&fields=${fields}`,
    `${graph}/paper/${encoded}/citations?limit=40&offset=0&fields=${fields}`,
    `${recommendations}/papers/forpaper/${encoded}?from=${pool}&limit=20&fields=${fields}`,
  ];
}

function titleOf(neighborhood: Neighborhood): string {
  return (
    neighborhood.nodes.find(
      (node) => node.paper.id === neighborhood.centerId,
    )?.paper.title ?? "Title unavailable."
  );
}

function catalogFrom(neighborhoods: Neighborhood[]): {
  paper: Paper;
  hasNeighborhood: boolean;
}[] {
  const stored = new Set(neighborhoods.map((item) => item.centerId));
  const papers = new Map<string, Paper>();
  for (const neighborhood of neighborhoods) {
    for (const node of neighborhood.nodes) {
      if (!papers.has(node.paper.id)) papers.set(node.paper.id, node.paper);
    }
  }
  return [...papers.values()]
    .sort((a, b) =>
      a.title.localeCompare(b.title, "en", { sensitivity: "base" }),
    )
    .map((paper) => ({
      paper,
      hasNeighborhood: stored.has(paper.id),
    }));
}

function pickNextCenter(neighborhood: Neighborhood): string | null {
  for (const membership of ["reference", "citing", "recommended"] as const) {
    const candidate = neighborhood.nodes.find(
      (node) =>
        node.paper.id !== neighborhood.centerId &&
        node.memberships.includes(membership) &&
        node.paper.id.trim().length > 0,
    );
    if (candidate) return candidate.paper.id;
  }
  return null;
}

async function fetchCenter(seed: string): Promise<Neighborhood> {
  const resolved = await resolvePaper(seed, "live");
  console.log(
    `Resolved seed "${seed}" to ${resolved.paper.id} (${resolved.paper.title}).`,
  );
  const neighborhood = await getNeighborhood(resolved.paper.id, "live");
  return { ...neighborhood, mode: "snapshot" };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  process.env.RECOMMENDATION_POOL = options.pool;
  const seen = new Set<string>();
  const neighborhoods: Neighborhood[] = [];
  const errors: string[] = [];

  // Explicit seeds first, then one linked neighbor per retrieved center so a
  // successful run produces at least two offline-recenterable centers when
  // the provider returns usable candidates.
  const queue = [...options.seeds];
  while (queue.length > 0 && neighborhoods.length < MAX_LINKED_CENTERS) {
    const seed = queue.shift();
    if (!seed) break;
    try {
      const neighborhood = await fetchCenter(seed);
      if (seen.has(neighborhood.centerId)) {
        console.log(`Skipping duplicate center ${neighborhood.centerId}.`);
        continue;
      }
      seen.add(neighborhood.centerId);
      neighborhoods.push(neighborhood);
      const next = pickNextCenter(neighborhood);
      if (
        next &&
        !seen.has(next) &&
        neighborhoods.length < MAX_LINKED_CENTERS
      ) {
        queue.push(next);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${seed}: ${message}`);
      console.error(`Failed to fetch "${seed}": ${message}`);
    }
  }

  if (neighborhoods.length === 0) {
    console.error(
      "\nNo snapshots were written. Semantic Scholar may be rate limiting this deployment.\n" +
        "Set SEMANTIC_SCHOLAR_API_KEY, wait for the limit to reset, or keep using the offline synthetic demo.",
    );
    process.exitCode = 1;
    return;
  }

  const centers: CenterEntry[] = neighborhoods.map((neighborhood) => {
    const center = neighborhood.nodes.find(
      (node) => node.paper.id === neighborhood.centerId,
    );
    return {
      id: neighborhood.centerId,
      title: titleOf(neighborhood),
      year: center?.paper.year ?? null,
      venue: center?.paper.venue ?? null,
      file: `neighborhoods/${safeFilename(neighborhood.centerId)}.json`,
      mode: "snapshot",
      provider: "semantic-scholar",
      nodeCount: neighborhood.nodes.length,
      neighborCount: neighborhood.nodes.length - 1,
      relationships: {
        references: neighborhood.coverage.references.validDistinctPapers,
        citing: neighborhood.coverage.citing.validDistinctPapers,
        recommended: neighborhood.coverage.recommended.validDistinctPapers,
      },
      fetchedAt: neighborhood.fetchedAt,
      recommendationPool: neighborhood.recommendationPool,
      sourceUrls: sourceUrls(neighborhood.centerId, options.pool),
    };
  });

  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    provider: "semantic-scholar",
    notice:
      "Real Semantic Scholar snapshot data. Neighborhoods are bounded samples, not complete citation graphs.",
    attribution: {
      api: "Semantic Scholar Academic Graph API and Recommendations API",
      license: "https://api.semanticscholar.org/license/",
      requirement:
        "Display the Semantic Scholar name and link with utm_source=api where required by the API license.",
    },
    availableCenterIds: neighborhoods.map((item) => item.centerId),
    provenance: {
      kind: "semantic-scholar-snapshot",
      label: "Stored Semantic Scholar snapshot",
      source: "https://api.semanticscholar.org/",
      retrievedAt: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
      recommendationPool: options.pool,
      limits: {
        references: 40,
        citing: 40,
        recommended: 20,
      },
      completeness:
        "Bounded sample per branch. Provider totals are metadata, not the number of stored neighbors.",
    },
    catalog: catalogFrom(neighborhoods),
    centers,
    errors,
  };

  if (options.dryRun) {
    console.log(
      `Dry run complete: fetched ${neighborhoods.length} neighborhood(s): ${centers
        .map((center) => center.id)
        .join(", ")}. No files written.`,
    );
    return;
  }

  const neighborhoodDir = path.join(options.outDir, "neighborhoods");
  await mkdir(neighborhoodDir, { recursive: true });
  for (const [index, neighborhood] of neighborhoods.entries()) {
    const entry = centers[index];
    await writeFile(
      path.join(options.outDir, entry.file),
      `${JSON.stringify(neighborhood, null, 2)}\n`,
      "utf8",
    );
  }
  await writeFile(
    path.join(options.outDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  const serialized = JSON.stringify(manifest);
  if (serialized.includes("SEMANTIC_SCHOLAR_API_KEY")) {
    throw new Error("Refusing to write: API key marker found in manifest.");
  }

  console.log(
    `Wrote ${neighborhoods.length} snapshot neighborhood(s) and a manifest to ${options.outDir}.`,
  );
  console.log(`Centers: ${centers.map((center) => center.id).join(", ")}`);
  console.log(
    "Review the Semantic Scholar API license and redistribution terms before publishing these files.",
  );
  if (errors.length > 0) {
    console.log(`Warnings (${errors.length}):\n${errors.join("\n")}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
