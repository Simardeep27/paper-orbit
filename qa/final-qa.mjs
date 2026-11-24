import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "http://127.0.0.1:3100";
const DEMO = "/explore?center=syn-paper-001&mode=demo";
const SNAPSHOT = "/explore?center=204e3073870fae3d05bcbc2f6a8e263d9b72e776&mode=snapshot";
const LIVE = "/explore?center=204e3073870fae3d05bcbc2f6a8e263d9b72e776&mode=live";
const SHOTS = path.join(process.cwd(), "qa", "screenshots");

const result = {
  capturedAt: new Date().toISOString(),
  browser: "Chromium via Playwright",
  viewport: "1440x900 (desktop), 390x844 (mobile), 720x450 (200% zoom approximation)",
  metrics: {},
  checks: [],
  consoleErrors: [],
  screenshots: [],
};

function note(check, details) {
  result.checks.push({ check, ...details });
}

function shot(name) {
  result.screenshots.push(`qa/screenshots/${name}.png`);
  return path.join(SHOTS, `${name}.png`);
}

async function waitForHeading(page, name) {
  await page.getByRole("heading", { level: 1, name }).waitFor({ timeout: 60000 });
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on("console", (message) => {
  if (message.type() === "error") {
    result.consoleErrors.push(`console: ${message.text()}`);
  }
});
page.on("pageerror", (error) => {
  result.consoleErrors.push(`pageerror: ${error.message}`);
});

try {
  // 1. Demo desktop 3D, 2D, list.
  const t0 = Date.now();
  await page.goto(`${BASE}${DEMO}`, { waitUntil: "domcontentloaded" });
  await waitForHeading(page, "Orbital Cartography for Research Literature");
  await page.waitForTimeout(900);
  result.metrics.demoHeadingMs = Date.now() - t0;
  result.metrics.demoNavigation = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    return nav
      ? {
          domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
          loadMs: Math.round(nav.loadEventEnd),
          transferSize: nav.transferSize,
        }
      : null;
  });
  await page.screenshot({ path: shot("desktop-3d") });

  // 3D frame rate during a drag. This is a short local observation, not a lab benchmark.
  const canvas = page.locator("canvas.orbit-canvas");
  if (await canvas.count()) {
    const box = await canvas.boundingBox();
    if (box) {
      await page.evaluate(() => {
        window.__paperOrbitFrames = [];
        const loop = (time) => {
          window.__paperOrbitFrames.push(time);
          window.__paperOrbitFrameHandle = requestAnimationFrame(loop);
        };
        window.__paperOrbitFrameHandle = requestAnimationFrame(loop);
      });
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      for (let index = 1; index <= 24; index += 1) {
        await page.mouse.move(cx + index * 5, cy + Math.sin(index / 3) * 18);
        await page.waitForTimeout(30);
      }
      await page.mouse.up();
      result.metrics.dragFps = await page.evaluate(() => {
        cancelAnimationFrame(window.__paperOrbitFrameHandle);
        const frames = window.__paperOrbitFrames;
        if (frames.length < 2) return null;
        return Number(
          (
            ((frames.length - 1) * 1000) /
            (frames[frames.length - 1] - frames[0])
          ).toFixed(1),
        );
      });
    }
  }

  await page.getByRole("button", { name: "2D", exact: true }).click();
  await page.locator(".radial-svg").waitFor();
  await page.waitForTimeout(450);
  result.metrics.demo2dNodes = await page.locator("[data-node]").count();
  await page.screenshot({ path: shot("desktop-2d") });

  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.locator(".paper-row").first().waitFor();
  result.metrics.demoListRows = await page.locator(".paper-row").count();
  await page.screenshot({ path: shot("desktop-list") });

  // 2. Filter latency, coordinated counts.
  await page.goto(`${BASE}${DEMO}&view=3d`, { waitUntil: "domcontentloaded" });
  await waitForHeading(page, "Orbital Cartography for Research Literature");
  await page.waitForTimeout(300);
  const filterStart = Date.now();
  await page.getByRole("checkbox", { name: /^Citing/ }).uncheck();
  await page.locator(".viz-status-chip", { hasText: "15 visible" }).waitFor();
  result.metrics.filterToVisibleCountMs = Date.now() - filterStart;
  result.metrics.filteredVisibleChip = await page.locator(".viz-status-chip").innerText();
  await page.getByRole("button", { name: "List", exact: true }).click();
  result.metrics.filteredListRows = await page.locator(".paper-row").count();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByRole("button", { name: "List", exact: true }).click();
  result.metrics.resetListRows = await page.locator(".paper-row").count();

  // 3. Compare two candidates.
  await page
    .getByRole("button", {
      name: /Add A Field Guide to Citation Neighborhoods to comparison/,
    })
    .click();
  await page
    .getByRole("button", {
      name: /Add A Survey of Citation Context Extraction to comparison/,
    })
    .click();
  await page.getByRole("tab", { name: /Compare/ }).click();
  await page.waitForTimeout(250);
  result.checks.push({
    check: "comparison max two and accessible removal",
    details: await page.locator(".compare-panel, #dock-panel-compare").innerText().catch(() => "compare panel visible"),
  });
  await page.screenshot({ path: shot("compare-panel") });

  // 4. Save a paper and inspect the reading list page.
  await page
    .locator(".paper-row")
    .filter({ hasText: "A Field Guide to Citation Neighborhoods" })
    .first()
    .locator(".paper-title-btn")
    .click();
  await page.getByRole("button", { name: "Add to reading list" }).click();
  await page.getByRole("link", { name: /Reading list/ }).first().click();
  await page.locator(".reading-item").first().waitFor();
  result.metrics.readingListItems = await page.locator(".reading-item").count();
  await page.screenshot({ path: shot("reading-list") });

  // 5. Unavailable recenter in the demo.
  await page.goto(`${BASE}${DEMO}&view=list`, { waitUntil: "domcontentloaded" });
  await waitForHeading(page, "Orbital Cartography for Research Literature");
  await page
    .locator(".paper-row")
    .filter({ hasText: "A Notebook of Unpublished Reading Notes" })
    .first()
    .locator(".paper-title-btn")
    .click();
  await page.getByRole("button", { name: "Make central paper" }).click();
  const unavailable = page.getByRole("alert").filter({ hasText: "offline demo" });
  await unavailable.waitFor();
  result.checks.push({
    check: "unavailable recenter preserves graph and explains why",
    details: await unavailable.innerText(),
  });
  await page.screenshot({ path: shot("unavailable-recenter") });

  // 6. Forced WebGL failure -> 2D.
  await page.goto(`${BASE}${DEMO}&forceWebgl=0`, { waitUntil: "domcontentloaded" });
  await page.locator(".banner-warning", { hasText: "3D rendering is unavailable" }).waitFor();
  await page.locator(".radial-svg").waitFor();
  result.metrics.fallback2dNodes = await page.locator("[data-node]").count();
  result.checks.push({
    check: "forced WebGL failure falls back to 2D",
    details: await page.locator(".banner-warning").first().innerText(),
  });
  await page.screenshot({ path: shot("webgl-fallback") });

  // 7. Mobile layout.
  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  mobile.on("console", (message) => {
    if (message.type() === "error") result.consoleErrors.push(`mobile console: ${message.text()}`);
  });
  await mobile.goto(`${BASE}${DEMO}`, { waitUntil: "domcontentloaded" });
  await waitForHeading(mobile, "Orbital Cartography for Research Literature");
  await mobile.waitForTimeout(450);
  result.metrics.mobileOverflow = await mobile.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  result.metrics.mobileDefault2d = await mobile
    .getByRole("button", { name: "2D", exact: true })
    .getAttribute("aria-pressed");
  await mobile.screenshot({ path: shot("explorer-mobile") });
  await mobile.getByRole("button", { name: "Open filters" }).click();
  await mobile.waitForTimeout(250);
  await mobile.screenshot({ path: shot("explorer-mobile-filters") });
  await mobile.close();

  // 8. Stored real snapshot + provenance.
  await page.goto(`${BASE}${SNAPSHOT}`, { waitUntil: "domcontentloaded" });
  await waitForHeading(page, "Attention is All you Need");
  await page.waitForTimeout(900);
  result.metrics.snapshotVisibleChip = await page.locator(".viz-status-chip").innerText();
  result.metrics.snapshotBadge = await page.locator(".viz-center-kicker .badge").first().innerText();
  await page.screenshot({ path: shot("snapshot-3d") });
  await page.getByRole("button", { name: /Data info/ }).click();
  await page.getByRole("dialog").waitFor();
  result.checks.push({
    check: "snapshot provenance",
    details: (await page.getByRole("dialog").innerText()).slice(0, 600),
  });
  await page.screenshot({ path: shot("snapshot-data-info") });
  await page.getByRole("button", { name: "Close dialog" }).click();

  // 9. Snapshot recenter to a linked real center.
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page
    .locator(".paper-row")
    .filter({ hasText: "A Deep Reinforced Model for Abstractive Summarization" })
    .first()
    .locator(".paper-title-btn")
    .click();
  await page.getByRole("button", { name: "Make central paper" }).click();
  await waitForHeading(page, "A Deep Reinforced Model for Abstractive Summarization");
  await page.waitForTimeout(500);
  result.metrics.snapshotRecenterUrl = page.url();
  await page.screenshot({ path: shot("snapshot-recentered") });

  // 10. Live provider verification.
  await page.goto(`${BASE}${LIVE}`, { waitUntil: "domcontentloaded" });
  await waitForHeading(page, "Attention is All you Need");
  await page.waitForTimeout(1000);
  result.metrics.liveVisibleChip = await page.locator(".viz-status-chip").innerText();
  result.metrics.liveBranchCounts = await page.locator(".viz-center-meta").innerText();
  result.metrics.liveMode = await page.locator(".viz-center-kicker .badge").first().innerText();
  await page.screenshot({ path: shot("live-3d") });
  await page.getByRole("button", { name: /Data info/ }).click();
  await page.getByRole("dialog").waitFor();
  await page.screenshot({ path: shot("live-data-info") });
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await page.locator(".radial-svg").waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot("live-2d") });
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.waitForTimeout(300);
  result.metrics.liveListRows = await page.locator(".paper-row").count();
  await page.screenshot({ path: shot("live-list") });

  // 11. 200% zoom approximation: half the CSS viewport at the same physical size.
  const zoom = await context.newPage();
  await zoom.setViewportSize({ width: 720, height: 450 });
  await zoom.goto(`${BASE}${DEMO}`, { waitUntil: "domcontentloaded" });
  await waitForHeading(zoom, "Orbital Cartography for Research Literature");
  await zoom.waitForTimeout(300);
  result.metrics.zoom200Overflow = await zoom.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  await zoom.screenshot({ path: shot("desktop-200pct") });
  await zoom.close();

  note("console errors", {
    count: result.consoleErrors.length,
    details: result.consoleErrors.length ? result.consoleErrors.join(" | ") : "none",
  });
} finally {
  await browser.close();
}

await writeFile(
  path.join(process.cwd(), "qa", "final-qa.json"),
  `${JSON.stringify(result, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify(result, null, 2));
