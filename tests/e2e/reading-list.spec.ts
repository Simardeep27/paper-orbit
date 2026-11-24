import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const DEMO_001_LIST = "/explore?center=syn-paper-001&mode=demo&view=list";

test("reading list survives reload and exports only saved papers as JSON", async ({
  page,
}) => {
  await page.goto(DEMO_001_LIST);
  const title = "A Field Guide to Citation Neighborhoods";
  const row = page.locator(".paper-row").filter({ hasText: title });
  await row.getByRole("button", { name: `Save ${title} to reading list` }).click();

  const stored = await page.evaluate(() =>
    window.localStorage.getItem("paper-orbit:reading-list:v1"),
  );
  expect(stored).not.toBeNull();
  expect(JSON.parse(stored ?? "{}").items).toHaveLength(1);

  await page.getByRole("link", { name: /Reading list/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Reading list" })).toBeVisible();
  await expect(page.locator(".reading-item")).toHaveCount(1);
  await expect(page.locator(".reading-item")).toContainText(title);

  await page.reload();
  await expect(page.locator(".reading-item")).toHaveCount(1);
  await expect(page.locator(".reading-item")).toContainText(title);

  const note = page.getByRole("textbox", { name: /Private note/ });
  await note.fill("Revisit the sampling section.");
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: /Private note/ }),
  ).toHaveValue("Revisit the sampling section.");

  const jsonDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON" }).click();
  const jsonDownload = await jsonDownloadPromise;
  expect(jsonDownload.suggestedFilename()).toMatch(
    /^paper-orbit-reading-list-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const jsonPath = await jsonDownload.path();
  expect(jsonPath).not.toBeNull();
  const parsed = JSON.parse(await readFile(jsonPath as string, "utf8"));
  expect(parsed.version).toBe(1);
  expect(parsed.items).toHaveLength(1);
  expect(parsed.items[0].paper.id).toBe("syn-paper-002");
  expect(parsed.items[0].note).toBe("Revisit the sampling section.");
  expect(parsed.items[0].paper.title).toBe(title);
  expect(JSON.stringify(parsed)).not.toContain("SEMANTIC_SCHOLAR_API_KEY");

  const markdownDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Markdown" }).click();
  const markdownDownload = await markdownDownloadPromise;
  const markdownPath = await markdownDownload.path();
  const markdown = await readFile(markdownPath as string, "utf8");
  expect(markdown).toContain("# Paper Orbit reading list");
  expect(markdown).toContain(title);
  expect(markdown).toContain("> Revisit the sampling section.");
  expect(markdown).toContain("Only saved papers are included");
});
