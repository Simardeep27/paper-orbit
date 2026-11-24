import { describe, expect, it } from "vitest";
import {
  DemoCenterUnavailableError,
  getDemoCatalogPaper,
  getDemoNeighborhood,
  loadDemoManifest,
  resolveDemoPaper,
  searchDemoCatalog,
} from "@/lib/providers/demo";
import { checkNeighborhoodInvariants } from "@/lib/graph/build";

describe("synthetic offline demo provider", () => {
  it("loads a versioned manifest with a clearly synthetic provenance", async () => {
    const manifest = await loadDemoManifest();
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.provider).toBe("synthetic-test");
    expect(manifest.provenance.kind).toBe("synthetic-interaction-demo");
    expect(manifest.catalog).toHaveLength(42);
    expect(manifest.centers).toHaveLength(3);
    expect(manifest.availableCenterIds).toEqual([
      "syn-paper-001",
      "syn-paper-002",
      "syn-paper-003",
    ]);
  });

  it("searches the local catalog and labels its source mode", async () => {
    const result = await searchDemoCatalog("citation neighborhoods", 0);
    expect(result.sourceMode).toBe("demo");
    expect(result.papers.length).toBeGreaterThan(0);
    expect(result.papers[0].title).toContain("Citation Neighborhood");
    expect(result.demoAvailableCenterIds).toContain("syn-paper-002");
  });

  it("supports paging offsets without network calls", async () => {
    const first = await searchDemoCatalog("citation", 0);
    const second = await searchDemoCatalog("citation", 10);
    expect(first.papers).toHaveLength(10);
    expect(first.nextOffset).toBe(10);
    expect(second.papers[0].id).not.toBe(first.papers[0].id);
  });

  it("resolves catalog IDs and returns null for unknown identifiers", async () => {
    expect((await resolveDemoPaper("syn-paper-001"))?.id).toBe("syn-paper-001");
    expect(await resolveDemoPaper("syn-paper-999")).toBeNull();
    expect(await getDemoCatalogPaper("nope")).toBeNull();
  });

  it("loads each stored neighborhood with valid invariants", async () => {
    for (const centerId of [
      "syn-paper-001",
      "syn-paper-002",
      "syn-paper-003",
    ]) {
      const neighborhood = await getDemoNeighborhood(centerId);
      expect(neighborhood.centerId).toBe(centerId);
      expect(neighborhood.mode).toBe("synthetic-demo");
      expect(checkNeighborhoodInvariants(neighborhood).ok).toBe(true);
      expect(neighborhood.demo?.availableCenterIds).toHaveLength(3);
    }
  });

  it("links stored centers in both citation directions", async () => {
    const first = await getDemoNeighborhood("syn-paper-001");
    const second = await getDemoNeighborhood("syn-paper-002");
    expect(
      first.edges.some(
        (edge) =>
          edge.source === "syn-paper-001" &&
          edge.target === "syn-paper-002",
      ),
    ).toBe(true);
    expect(
      second.edges.some(
        (edge) =>
          edge.source === "syn-paper-001" &&
          edge.target === "syn-paper-002",
      ),
    ).toBe(true);

    const third = await getDemoNeighborhood("syn-paper-003");
    expect(
      second.edges.some(
        (edge) =>
          edge.source === "syn-paper-003" &&
          edge.target === "syn-paper-002",
      ),
    ).toBe(true);
    expect(
      third.edges.some(
        (edge) =>
          edge.source === "syn-paper-003" &&
          edge.target === "syn-paper-002",
      ),
    ).toBe(true);
  });

  it("explains when a catalog-only paper has no stored neighborhood", async () => {
    await expect(getDemoNeighborhood("syn-paper-042")).rejects.toBeInstanceOf(
      DemoCenterUnavailableError,
    );
    await expect(getDemoNeighborhood("syn-paper-042")).rejects.toThrow(
      /not included in the offline demo/,
    );
  });

  it("marks synthetic records with synthetic provenance", async () => {
    const paper = await getDemoCatalogPaper("syn-paper-001");
    expect(paper?.source).toBe("synthetic-test");
    expect(paper?.url).toBeNull();
  });
});
