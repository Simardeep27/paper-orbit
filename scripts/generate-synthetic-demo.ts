import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildNeighborhood } from "../lib/graph/build";
import { parseNeighborhoodFixture } from "../lib/graph/build";
import {
  SYNTHETIC_BY_ID,
  SYNTHETIC_CENTER_IDS,
  SYNTHETIC_FETCHED_AT,
  SYNTHETIC_GENERATED_AT,
  SYNTHETIC_NEIGHBORHOODS,
  SYNTHETIC_PAPERS,
} from "./demo-data";

const ROOT = path.resolve(__dirname, "..");
const DEMO_DIR = path.join(ROOT, "data", "demo");
const NEIGHBORHOOD_DIR = path.join(DEMO_DIR, "neighborhoods");

function getPaper(id: string) {
  const paper = SYNTHETIC_BY_ID.get(id);
  if (!paper) throw new Error(`Unknown synthetic paper ${id}`);
  return paper;
}

async function main() {
  await mkdir(NEIGHBORHOOD_DIR, { recursive: true });

  const fileFor = (id: string) => `neighborhoods/${id}.json`;
  const centers: Record<string, unknown>[] = [];

  for (const spec of SYNTHETIC_NEIGHBORHOODS) {
    const center = getPaper(spec.centerId);
    const references = spec.references.map(getPaper);
    const citing = spec.citing.map(getPaper);
    const recommendedItems = spec.recommended.map((id, index) => ({
      paper: getPaper(id),
      rank: index + 1,
    }));

    const neighborhood = buildNeighborhood({
      center,
      references: {
        papers: references,
        receivedEntries: references.length,
        skippedEntries: 0,
        requestedLimit: 40,
        nextOffset: null,
        status: references.length === 0 ? undefined : "ok",
      },
      citing: {
        papers: citing,
        receivedEntries: citing.length,
        skippedEntries: 0,
        requestedLimit: 40,
        nextOffset: null,
      },
      recommended: {
        items: recommendedItems,
        receivedEntries: recommendedItems.length,
        skippedEntries: 0,
        requestedLimit: 20,
        nextOffset: null,
      },
      mode: "synthetic-demo",
      provider: "synthetic-test",
      fetchedAt: SYNTHETIC_FETCHED_AT,
      recommendationPool: "all-cs",
      similarityComputedAt: SYNTHETIC_FETCHED_AT,
      warnings: [
        "Synthetic interaction demo: every title, author, venue, year, citation count, abstract, and relationship is fictional.",
        "Branches are bounded synthetic samples, not complete citation graphs. Recommendations use the all-cs pool and carry ordering only.",
      ],
      demo: {
        availableCenterIds: SYNTHETIC_CENTER_IDS,
        notice:
          "Synthetic interaction demo. This offline neighborhood is fictional and is not a record of real research.",
      },
    });

    parseNeighborhoodFixture(neighborhood);
    await writeFile(
      path.join(DEMO_DIR, fileFor(spec.centerId)),
      `${JSON.stringify(neighborhood, null, 2)}\n`,
      "utf8",
    );

    const neighborCount = neighborhood.nodes.length - 1;
    centers.push({
      id: center.id,
      title: center.title,
      year: center.year,
      venue: center.venue,
      file: fileFor(spec.centerId),
      mode: "synthetic-demo",
      provider: "synthetic-test",
      nodeCount: neighborhood.nodes.length,
      neighborCount,
      relationships: {
        references: neighborhood.coverage.references.validDistinctPapers,
        citing: neighborhood.coverage.citing.validDistinctPapers,
        recommended: neighborhood.coverage.recommended.validDistinctPapers,
      },
      fetchedAt: neighborhood.fetchedAt,
    });
  }

  const stored = new Set(SYNTHETIC_CENTER_IDS);
  const manifest = {
    schemaVersion: 1,
    generatedAt: SYNTHETIC_GENERATED_AT,
    provider: "synthetic-test",
    notice:
      "Synthetic interaction demo. All catalog records and neighborhoods are fictional and must not be presented as real research data.",
    availableCenterIds: SYNTHETIC_CENTER_IDS,
    provenance: {
      kind: "synthetic-interaction-demo",
      label: "Synthetic interaction demo",
      description:
        "Deterministic, hand-authored fictional papers used to exercise the full workflow without network access or provider credentials.",
      source: "paper-orbit repository fixtures",
      retrievedAt: SYNTHETIC_GENERATED_AT,
      schemaVersion: 1,
      recommendationPool: "all-cs",
      completeness:
        "Each stored neighborhood contains a bounded sample of fictional references, citing papers, and recommendations. It is not a complete graph.",
    },
    catalog: SYNTHETIC_PAPERS.map((paper) => ({
      paper,
      hasNeighborhood: stored.has(paper.id),
    })),
    centers,
  };

  await writeFile(
    path.join(DEMO_DIR, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Wrote ${centers.length} synthetic neighborhoods and ${SYNTHETIC_PAPERS.length} catalog records to ${DEMO_DIR}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
