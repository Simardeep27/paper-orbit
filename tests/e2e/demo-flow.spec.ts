import { expect, test, type Page } from "@playwright/test";

const DEMO_001 = "/explore?center=syn-paper-001&mode=demo";

async function visibleCount(page: Page): Promise<number> {
  const text = await page.locator(".viz-status-chip").innerText();
  const match = text.match(/(\d+)\s+visible/);
  if (!match) throw new Error(`Unexpected status chip text: ${text}`);
  return Number(match[1]);
}

async function histogramVisibleCount(page: Page): Promise<number> {
  const text = await page.locator(".hist-title span").innerText();
  const match = text.match(/(\d+)\s+visible/);
  if (!match) throw new Error(`Unexpected histogram text: ${text}`);
  return Number(match[1]);
}

test("demo search opens the center neighborhood in every view", async ({
  page,
}) => {
  await page.goto("/");
  const search = page.getByRole("searchbox", {
    name: /Search papers, paste a DOI, or enter an arXiv ID/,
  });
  await search.fill("Orbital Cartography");
  await page.getByRole("button", { name: "Explore paper" }).click();

  const result = page.getByRole("button", {
    name: /Explore Orbital Cartography for Research Literature/,
  });
  await expect(result).toBeVisible();
  await result.click();

  await expect(page).toHaveURL(/center=syn-paper-001/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Orbital Cartography for Research Literature",
    }),
  ).toBeVisible();
  await expect(page.locator(".viz-status-chip")).toContainText("20 visible");
  await expect(page.getByText("Synthetic demo", { exact: false }).first()).toBeVisible();

  await page.getByRole("button", { name: "2D", exact: true }).click();
  await expect(page.locator("[data-node]")).toHaveCount(21);

  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.locator(".paper-row")).toHaveCount(20);

  const row = page
    .locator(".paper-row")
    .filter({ hasText: "A Field Guide to Citation Neighborhoods" });
  await row.locator(".paper-title-btn").click();
  await expect(page.locator("#paper-details")).toContainText(
    "A Field Guide to Citation Neighborhoods",
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Orbital Cartography for Research Literature",
    }),
  ).toBeVisible();
});

test("filters keep graph, list, counts, and histogram in agreement", async ({
  page,
}) => {
  await page.goto(`${DEMO_001}&view=list`);
  await expect(page.locator(".paper-row")).toHaveCount(20);
  await expect.poll(() => visibleCount(page)).toBe(20);

  await page.getByRole("checkbox", { name: /^Citing/ }).uncheck();
  await expect.poll(() => visibleCount(page)).toBeLessThan(20);
  const afterRelationship = await visibleCount(page);

  await expect(page.locator(".paper-row")).toHaveCount(afterRelationship);
  await expect.poll(() => histogramVisibleCount(page)).toBe(afterRelationship);

  const from = page
    .locator("#filter-rail")
    .getByRole("spinbutton", { name: "From" });
  await from.fill("2015");
  await from.press("Enter");

  await expect
    .poll(() => visibleCount(page))
    .toBeLessThan(afterRelationship);
  const afterYear = await visibleCount(page);

  await expect(page.locator(".paper-row")).toHaveCount(afterYear);
  await expect.poll(() => histogramVisibleCount(page)).toBe(afterYear);

  await page.getByRole("button", { name: "2D", exact: true }).click();
  await expect(page.locator("[data-node]")).toHaveCount(afterYear + 1);

  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect.poll(() => visibleCount(page)).toBe(20);
  await expect(page.locator(".paper-row")).toHaveCount(20);
});

test("recenter stores history and restores the previous filters on back", async ({
  page,
}) => {
  await page.goto(`${DEMO_001}&view=list`);
  await expect(page.locator(".paper-row")).toHaveCount(20);

  const from = page
    .locator("#filter-rail")
    .getByRole("spinbutton", { name: "From" });
  await from.fill("2015");
  await from.press("Enter");
  await expect(page.locator(".filter-summary")).toContainText("Filtered view");

  await page
    .locator(".paper-row")
    .filter({ hasText: "A Field Guide to Citation Neighborhoods" })
    .locator(".paper-title-btn")
    .click();
  await page.getByRole("button", { name: "Make central paper" }).click();

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "A Field Guide to Citation Neighborhoods",
    }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/center=syn-paper-002/);

  await page.goBack();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Orbital Cartography for Research Literature",
    }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/yearStart=2015/);
  await expect(
    page.locator("#filter-rail").getByRole("spinbutton", { name: "From" }),
  ).toHaveValue("2015");
});

test("unavailable demo center preserves the old graph and explains why", async ({
  page,
}) => {
  await page.goto(`${DEMO_001}&view=list`);
  await expect(page.locator(".paper-row")).toHaveCount(20);

  const row = page
    .locator(".paper-row")
    .filter({ hasText: "A Notebook of Unpublished Reading Notes" });
  await row.locator(".paper-title-btn").click();
  await expect(page.locator(".recenter-note")).toContainText(
    "no stored offline neighborhood",
  );
  await page.getByRole("button", { name: "Make central paper" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "not included in the offline demo" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Available demo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Orbital Cartography for Research Literature",
    }),
  ).toBeVisible();
  await expect(page.locator(".paper-row")).toHaveCount(20);
  await expect(page).toHaveURL(/center=syn-paper-001/);
});

test("comparison keeps at most two candidates and supports accessible removal", async ({
  page,
}) => {
  await page.goto(`${DEMO_001}&view=list`);
  const compareButtons = page.getByRole("button", {
    name: /^Add .* to comparison$/,
  });
  await compareButtons.nth(0).click();
  await compareButtons.nth(1).click();
  await compareButtons.nth(2).click();

  const compareTab = page.getByRole("tab", { name: /Compare/ });
  await expect(compareTab).toContainText("2");
  await compareTab.click();
  await expect(page.locator(".compare-card")).toHaveCount(2);
  await expect(page.getByText("2 of 2 selected")).toBeVisible();

  await page
    .locator(".compare-card")
    .first()
    .getByRole("button", { name: /Remove .* from comparison/ })
    .click();
  await expect(page.locator(".compare-card")).toHaveCount(1);
  await expect(compareTab).toContainText("1");
});
