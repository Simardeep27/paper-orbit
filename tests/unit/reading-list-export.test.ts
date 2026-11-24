import { describe, expect, it } from "vitest";
import {
  buildReadingListMarkdown,
  escapeMarkdown,
  readingListToExport,
  sanitizeFilename,
} from "@/lib/graph/export";
import {
  loadReadingList,
  paperToSavedPaper,
  saveReadingList,
} from "@/lib/state/persistence";
import { makeNeighborhood, makePaper } from "../fixtures/graph";

function savedFixture(note = "Read **carefully**\nCheck citation direction.") {
  const paper = makePaper("saved-1", {
    title: "A [Bracket] Paper *With* Markdown",
    authors: [
      { id: "a1", name: "Ada Lovelace" },
      { id: "a2", name: "Grace Hopper" },
    ],
    year: 2021,
    venue: "Journal of Testing",
    externalIds: { DOI: "10.1000/xyz" },
  });
  const saved = paperToSavedPaper(
    paper,
    "center",
    "Center | Paper",
  );
  saved.note = note;
  return saved;
}

describe("reading-list export", () => {
  it("round-trips through versioned local storage", () => {
    const storage = window.localStorage;
    storage.clear();
    const saved = savedFixture();

    const result = saveReadingList([saved], storage);
    expect(result.ok).toBe(true);
    expect(result.warning).toBeNull();

    const loaded = loadReadingList(storage);
    expect(loaded.warning).toBeNull();
    expect(loaded.items).toHaveLength(1);
    expect(loaded.items[0]?.paper.id).toBe("saved-1");
    expect(loaded.items[0]?.note).toContain("Check citation");
  });

  it("reports malformed storage without overwriting it", () => {
    const storage = window.localStorage;
    storage.clear();
    storage.setItem("paper-orbit:reading-list:v1", '{"version":2}');

    const loaded = loadReadingList(storage);
    expect(loaded.items).toEqual([]);
    expect(loaded.warning).toMatch(/not readable/);
    expect(storage.getItem("paper-orbit:reading-list:v1")).toBe(
      '{"version":2}',
    );
  });

  it("builds escaped Markdown with provenance and no unrelated state", () => {
    const saved = savedFixture();
    const neighborhood = makeNeighborhood({
      center: makePaper("center", { title: "Center Paper" }),
    });
    const markdown = buildReadingListMarkdown([saved], neighborhood);

    expect(markdown).toContain("# Paper Orbit reading list");
    expect(markdown).toContain("Items: 1");
    expect(markdown).toContain(
      "A \\[Bracket\\] Paper \\*With\\* Markdown",
    );
    expect(markdown).toContain("- Note:");
    expect(markdown).toContain("> Read \\*\\*carefully\\*\\*");
    expect(markdown).toContain("https://doi.org/10.1000/xyz");
    expect(markdown).toContain("synthetic demo");
    expect(markdown).not.toContain("localStorage");
    expect(markdown).not.toContain("API_KEY");
  });

  it("serializes JSON with algorithm version and only saved items", () => {
    const saved = savedFixture("note");
    const neighborhood = makeNeighborhood();
    const exported = readingListToExport([saved], neighborhood);
    const json = JSON.parse(JSON.stringify(exported));

    expect(json.version).toBe(1);
    expect(json.items).toHaveLength(1);
    expect(json.items[0].paper.id).toBe("saved-1");
    expect(json.provenance.app).toBe("Paper Orbit");
    expect(json.provenance.similarityVersion).toBe("1.0.0");
    expect(json.provenance.source).toContain("synthetic demo");
    expect(json.provenance.note).toContain("Only user-saved papers");
  });

  it("escapes Markdown and sanitizes filenames", () => {
    expect(escapeMarkdown("a *b* [c]")).toBe("a \\*b\\* \\[c\\]");
    expect(sanitizeFilename("Paper Orbit / 3D: Map?")).toBe(
      "paper-orbit-3d-map",
    );
    expect(sanitizeFilename("...")).toBe("paper-orbit");
  });
});
