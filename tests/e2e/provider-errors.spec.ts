import { expect, test } from "@playwright/test";

test("live rate limiting is an actionable error, not an empty result", async ({
  page,
}) => {
  await page.route("**/api/search?**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("mode") !== "live") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "RATE_LIMITED",
          message:
            "Live mode has no server-side API key and is using Semantic Scholar's shared unauthenticated quota. Try again later. Add SEMANTIC_SCHOLAR_API_KEY on the server, or use Stored snapshot mode for bundled real data.",
          retryAfterSeconds: 20,
          retryable: true,
        },
      }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Live" }).click();
  const search = page.getByRole("searchbox", {
    name: /Search papers, paste a DOI, or enter an arXiv ID/,
  });
  await search.fill("attention");
  await page.getByRole("button", { name: "Explore paper" }).click();

  const alert = page.locator(".search-results[role=\"alert\"]");
  await expect(alert).toContainText("no server-side API key");
  await expect(alert).toContainText("Stored snapshot mode");
  await expect(
    alert.getByRole("link", { name: "Browse stored snapshots" }),
  ).toBeVisible();
  await expect(page.getByText("No papers matched")).toHaveCount(0);
});

test("a failed recommendation branch is labeled as partial, not empty", async ({
  page,
}) => {
  await page.route("**/api/neighborhood?**", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.nodes = body.nodes
      .map((node: { memberships: string[] }) => ({
        ...node,
        memberships: node.memberships.filter(
          (membership) => membership !== "recommended",
        ),
      }))
      .filter(
        (node: { paper: { id: string }; memberships: string[] }) =>
          node.paper.id === body.centerId || node.memberships.length > 0,
      );
    body.recommendations = [];
    body.coverage.recommended = {
      status: "unavailable",
      requestedLimit: 20,
      receivedEntries: 0,
      validDistinctPapers: 0,
      skippedEntries: 0,
      nextOffset: null,
      message:
        "Recommendations are unavailable from this provider right now. This is not an empty recommendation list.",
    };
    await route.fulfill({
      response,
      json: body,
    });
  });

  await page.goto("/explore?center=syn-paper-001&mode=demo");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Orbital Cartography for Research Literature",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/Some branches are unavailable or incomplete/),
  ).toBeVisible();

  await page.getByRole("button", { name: "Branch details" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Recommendations");
  await expect(dialog).toContainText("unavailable");
  await expect(dialog).toContainText("not an empty recommendation list");
});

test("a live neighborhood rate limit offers stored snapshots", async ({
  page,
}) => {
  await page.route("**/api/neighborhood?**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("mode") !== "live") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "RATE_LIMITED",
          message:
            "Live mode has no server-side API key and is using Semantic Scholar's shared unauthenticated quota. Try again later. Add SEMANTIC_SCHOLAR_API_KEY on the server, or use Stored snapshot mode for bundled real data.",
          retryable: true,
        },
      }),
    });
  });

  await page.goto(
    "/explore?center=204e3073870fae3d05bcbc2f6a8e263d9b72e776&mode=live",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "The neighborhood could not load" }),
  ).toBeVisible();
  await expect(page.getByText(/no server-side API key/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse stored snapshots" }),
  ).toBeVisible();
});
