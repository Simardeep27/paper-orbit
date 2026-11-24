import { expect, test } from "@playwright/test";

const ATTENTION = "204e3073870fae3d05bcbc2f6a8e263d9b72e776";
const DEEP_REINFORCED = "032274e57f7d8b456bd255fe76b909b2c1d7458e";

test("stored snapshots are searchable and recenter to linked real centers", async ({
  page,
}) => {
  await page.goto("/explore?mode=snapshot");
  await expect(
    page.getByRole("heading", { name: "Explore a paper neighborhood" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Snapshot", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");

  const search = page.getByRole("searchbox", {
    name: /Search papers, paste a DOI, or enter an arXiv ID/,
  });
  await search.fill("Attention Is All You Need");
  await page.getByRole("button", { name: "Explore paper" }).click();

  const result = page.getByRole("button", {
    name: /Explore Attention is All you Need/,
  });
  await expect(result).toBeVisible();
  await expect(
    page.getByText("Stored Semantic Scholar snapshot", { exact: false }).first(),
  ).toBeVisible();
  await result.click();

  await expect(page).toHaveURL(new RegExp(`center=${ATTENTION}`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Attention is All you Need" }),
  ).toBeVisible();
  await expect(page.locator(".badge", { hasText: "Stored snapshot" }).first()).toBeVisible();
  await expect(page.locator(".viz-status-chip")).toContainText("99 visible");
  await expect(page.getByText("Synthetic demo", { exact: false })).toHaveCount(0);

  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.locator(".paper-row")).toHaveCount(99);

  const linked = page
    .locator(".paper-row")
    .filter({ hasText: "A Deep Reinforced Model for Abstractive Summarization" });
  await linked.locator(".paper-title-btn").click();
  await page.getByRole("button", { name: "Make central paper" }).click();
  await expect(page).toHaveURL(new RegExp(`center=${DEEP_REINFORCED}`));
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "A Deep Reinforced Model for Abstractive Summarization",
    }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/mode=snapshot/);

  const deeper = page
    .locator(".paper-row")
    .filter({
      hasText: "A Learning Algorithm for Continually Running Fully Recurrent Neural Networks",
    })
    .first();
  await deeper.locator(".paper-title-btn").click();
  await page.getByRole("button", { name: "Make central paper" }).click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "A Learning Algorithm for Continually Running Fully Recurrent Neural Networks",
    }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/ce9a21b93ba29d4145a8ef6bf401e77f261848de/);

  await page.goBack();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "A Deep Reinforced Model for Abstractive Summarization",
    }),
  ).toBeVisible({ timeout: 15_000 });
  await page.goBack();
  await expect(
    page.getByRole("heading", { level: 1, name: "Attention is All you Need" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(new RegExp(`center=${ATTENTION}`));
});

test("an unstored snapshot paper preserves the graph and explains the limit", async ({
  page,
}) => {
  await page.goto(`/explore?center=${ATTENTION}&mode=snapshot&view=list`);
  await expect(page.locator(".paper-row")).toHaveCount(99);

  const row = page
    .locator(".paper-row")
    .filter({ hasText: "Long Short-Term Memory" })
    .first();
  await row.locator(".paper-title-btn").click();
  await expect(page.locator(".recenter-note")).toContainText(
    "no stored offline neighborhood",
  );
  await page.getByRole("button", { name: "Make central paper" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "stored offline snapshot" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse snapshots" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "Attention is All you Need" }),
  ).toBeVisible();
  await expect(page.locator(".paper-row")).toHaveCount(99);
});
