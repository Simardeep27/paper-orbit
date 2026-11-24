import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  SnapshotCenterUnavailableError,
  getSnapshotNeighborhood,
  loadSnapshotManifest,
  searchSnapshotCatalog,
} from "@/lib/providers/snapshot";
import { checkNeighborhoodInvariants } from "@/lib/graph/build";

const SNAPSHOT_ROOT = path.join(process.cwd(), "data", "snapshots");

describe("stored Semantic Scholar snapshots", () => {
  it("loads a real-data manifest with no secret material", async () => {
    const manifest = await loadSnapshotManifest();
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.provider).toBe("semantic-scholar");
    expect(manifest.provenance.kind).toBe("semantic-scholar-snapshot");
    expect(manifest.availableCenterIds).toHaveLength(3);
    expect(manifest.centers).toHaveLength(3);
    expect(manifest.catalog.length).toBeGreaterThan(100);
    expect(manifest.attribution?.license).toContain(
      "api.semanticscholar.org/license",
    );

    const raw = await readFile(
      path.join(SNAPSHOT_ROOT, "manifest.json"),
      "utf8",
    );
    expect(raw).not.toContain("SEMANTIC_SCHOLAR_API_KEY");
    expect(raw).not.toContain("s2" + "k-");
  });

  it("loads every stored center with valid invariants and offline metadata", async () => {
    const manifest = await loadSnapshotManifest();
    for (const centerId of manifest.availableCenterIds) {
      const neighborhood = await getSnapshotNeighborhood(centerId);
      expect(neighborhood.centerId).toBe(centerId);
      expect(neighborhood.mode).toBe("snapshot");
      expect(neighborhood.provider).toBe("semantic-scholar");
      expect(neighborhood.offline?.availableCenterIds).toEqual(
        manifest.availableCenterIds,
      );
      expect(checkNeighborhoodInvariants(neighborhood).ok).toBe(true);
    }
  });

  it("preserves a failed branch as partial data instead of an empty list", async () => {
    const third =
      "ce9a21b93ba29d4145a8ef6bf401e77f261848de";
    const neighborhood = await getSnapshotNeighborhood(third);
    expect(neighborhood.coverage.references.status).not.toBe("ok");
    expect(neighborhood.coverage.references.message).toBeTruthy();
    expect(neighborhood.coverage.citing.status).toBe("ok");
  });

  it("searches only the stored catalog and labels snapshot availability", async () => {
    const result = await searchSnapshotCatalog("attention", 0);
    expect(result.sourceMode).toBe("snapshot");
    expect(result.papers[0]?.title.toLowerCase()).toContain("attention");
    expect(result.snapshotAvailableCenterIds).toHaveLength(3);
    expect(result.demoAvailableCenterIds).toBeUndefined();
  });

  it("explains an unstored snapshot center", async () => {
    await expect(
      getSnapshotNeighborhood("not-a-stored-center"),
    ).rejects.toBeInstanceOf(SnapshotCenterUnavailableError);
  });
});
