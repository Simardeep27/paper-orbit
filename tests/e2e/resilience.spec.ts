import { expect, test, type Page } from "@playwright/test";

const DEMO_001 = "/explore?center=syn-paper-001&mode=demo";

async function tabUntil(
  page: Page,
  predicate: (info: {
    text: string;
    ariaLabel: string;
    labelText: string;
    tag: string;
    type: string;
  }) => boolean,
  maxTabs = 220,
): Promise<void> {
  for (let index = 0; index < maxTabs; index += 1) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      const label = element?.closest("label");
      return {
        text: (element?.innerText ?? "").trim(),
        ariaLabel: element?.getAttribute("aria-label") ?? "",
        labelText: (label?.innerText ?? "").trim(),
        tag: element?.tagName.toLowerCase() ?? "",
        type:
          element instanceof HTMLInputElement ? element.type : "",
      };
    });
    if (predicate(info)) return;
  }
  throw new Error("Could not reach the requested control by keyboard.");
}

test("forced WebGL failure switches to 2D and keeps analysis usable", async ({
  page,
}) => {
  await page.goto(`${DEMO_001}&forceWebgl=0`);
  await expect(
    page.locator(".banner-warning").filter({
      hasText: "3D rendering is unavailable",
    }),
  ).toBeVisible();
  await expect(page.locator(".radial-svg")).toBeVisible();
  await expect(page.locator("[data-node]")).toHaveCount(21);
  await expect(page.getByRole("button", { name: "3D", exact: true })).toBeDisabled();

  await page.getByRole("checkbox", { name: /^Recommended/ }).uncheck();
  await expect(page.locator(".paper-row")).toHaveCount(12);
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.locator(".paper-row")).toHaveCount(12);
});

test("mobile layout has no horizontal overflow and keeps core actions reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(DEMO_001);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Orbital Cartography for Research Literature",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "2D", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");

  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
    body: document.body.scrollWidth,
  }));
  expect(overflow.document).toBeLessThanOrEqual(overflow.viewport);
  expect(overflow.body).toBeLessThanOrEqual(overflow.viewport);

  await page.getByRole("button", { name: "Open filters" }).click();
  await expect(page.locator("#filter-rail")).toHaveClass(/filter-rail-open/);
  await page.getByRole("checkbox", { name: /^Citing/ }).uncheck();
  await page
    .locator("#filter-rail")
    .getByRole("button", { name: "Close filters" })
    .click();

  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.locator(".paper-row")).toHaveCount(15);
  await page
    .locator(".paper-row")
    .filter({ hasText: "A Field Guide to Citation Neighborhoods" })
    .locator(".paper-title-btn")
    .click();
  await expect(page.locator("#paper-details")).toContainText(
    "A Field Guide to Citation Neighborhoods",
  );
  await expect(
    page.getByRole("button", { name: "Make central paper" }),
  ).toBeVisible();

  const afterOverflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(afterOverflow.document).toBeLessThanOrEqual(afterOverflow.viewport);
});

test("reduced motion disables automatic rotation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(DEMO_001);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Orbital Cartography for Research Literature",
    }),
  ).toBeVisible();
  const autoRotate = page.getByRole("button", { name: "Start auto-rotation" });
  await expect(autoRotate).toBeDisabled();
  await expect(autoRotate).toHaveAttribute(
    "title",
    "Auto-rotation is disabled by reduced-motion preferences",
  );
});

test("a keyboard-only user can search and open a result", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("searchbox", {
    name: /Search papers, paste a DOI, or enter an arXiv ID/,
  });
  await expect(search).toBeFocused();
  await page.keyboard.type("Orbital Cartography");
  await page.keyboard.press("Enter");

  await expect(
    page.getByRole("button", {
      name: /Explore Orbital Cartography for Research Literature/,
    }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Orbital Cartography for Research Literature",
    }),
  ).toBeVisible({ timeout: 15_000 });
});

test("a keyboard-only user can filter, select, save, and recenter", async ({
  page,
}) => {
  await page.goto(`${DEMO_001}&view=list`);
  await expect(page.locator(".paper-row")).toHaveCount(20);

  await tabUntil(
    page,
    (info) =>
      info.tag === "input" &&
      info.type === "checkbox" &&
      info.labelText.startsWith("Reference"),
  );
  await page.keyboard.press("Space");
  await expect(page.getByRole("checkbox", { name: /^Reference/ })).not.toBeChecked();
  await page.keyboard.press("Space");
  await expect(page.getByRole("checkbox", { name: /^Reference/ })).toBeChecked();

  await tabUntil(
    page,
    (info) =>
      info.tag === "button" &&
      info.text === "A Field Guide to Citation Neighborhoods",
  );
  await page.keyboard.press("Enter");
  await expect(page.locator("#paper-details")).toContainText(
    "A Field Guide to Citation Neighborhoods",
  );

  await tabUntil(
    page,
    (info) => info.tag === "button" && info.text === "Add to reading list",
  );
  await page.keyboard.press("Enter");
  await expect
    .poll(async () =>
      page.evaluate(() =>
        window.localStorage.getItem("paper-orbit:reading-list:v1"),
      ),
    )
    .not.toBeNull();

  await page.keyboard.press("Shift+Tab");
  await expect
    .poll(() =>
      page.evaluate(
        () => (document.activeElement as HTMLElement | null)?.innerText.trim(),
      ),
    )
    .toBe("Make central paper");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "A Field Guide to Citation Neighborhoods",
    }),
  ).toBeVisible({ timeout: 15_000 });
});
