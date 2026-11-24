import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "http://127.0.0.1:3100";
const DEMO = "/explore?center=syn-paper-001&mode=demo";
const SNAPSHOT = "/explore?center=204e3073870fae3d05bcbc2f6a8e263d9b72e776&mode=snapshot";

const result = {
  capturedAt: new Date().toISOString(),
  hardware: "Local macOS review machine; Chromium headless via Playwright; viewport 1440x900; deviceScaleFactor 1",
  fps: {},
  filterLatency: {},
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function measureFps(label) {
  const canvas = page.locator("canvas.orbit-canvas");
  await canvas.waitFor();
  await page.waitForTimeout(1200);
  const box = await canvas.boundingBox();
  if (!box) throw new Error("No canvas box");
  const samples = [];
  for (let trial = 0; trial < 3; trial += 1) {
    await page.evaluate(() => {
      window.__perfFrames = [];
      const tick = (time) => {
        window.__perfFrames.push(time);
        window.__perfHandle = requestAnimationFrame(tick);
      };
      window.__perfHandle = requestAnimationFrame(tick);
    });
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let index = 1; index <= 28; index += 1) {
      await page.mouse.move(cx + index * 4, cy + Math.sin(index / 4) * 20);
      await page.waitForTimeout(28);
    }
    await page.mouse.up();
    samples.push(
      await page.evaluate(() => {
        cancelAnimationFrame(window.__perfHandle);
        const frames = window.__perfFrames;
        if (frames.length < 2) return null;
        return Number(
          (
            ((frames.length - 1) * 1000) /
            (frames[frames.length - 1] - frames[0])
          ).toFixed(1),
        );
      }),
    );
    await page.waitForTimeout(250);
  }
  result.fps[label] = {
    samples,
    median: samples.filter((value) => value !== null).sort((a, b) => a - b)[1],
  };
}

async function measureFilterLatency() {
  await page.goto(`${BASE}${DEMO}&view=list`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1, name: "Orbital Cartography for Research Literature" }).waitFor();
  await page.waitForTimeout(400);
  const samples = await page.evaluate(async () => {
    const input = [...document.querySelectorAll("input[type=checkbox]")].find(
      (candidate) => candidate.closest("label")?.innerText.startsWith("Citing"),
    );
    const chip = document.querySelector(".viz-status-chip");
    const listCount = () => document.querySelectorAll(".paper-row").length;
    if (!(input instanceof HTMLInputElement) || !chip) {
      throw new Error("Filter controls not found");
    }
    const times = [];
    for (let index = 0; index < 6; index += 1) {
      const expected = input.checked ? "15 visible" : "20 visible";
      const started = performance.now();
      input.click();
      await new Promise((resolve, reject) => {
        const deadline = performance.now() + 2000;
        const check = () => {
          if (
            chip.textContent?.includes(expected) &&
            listCount() === (expected.startsWith("15") ? 15 : 20)
          ) {
            resolve(undefined);
          } else if (performance.now() > deadline) {
            reject(new Error("Timed out waiting for filter update"));
          } else {
            requestAnimationFrame(check);
          }
        };
        requestAnimationFrame(check);
      });
      times.push(Number((performance.now() - started).toFixed(1)));
    }
    return times;
  });
  result.filterLatency = {
    samplesMs: samples,
    medianMs: [...samples].sort((a, b) => a - b)[3],
    note: "Measured inside the page from checkbox click to coordinated chip/list DOM update; includes React render.",
  };
}

try {
  await page.goto(`${BASE}${DEMO}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1, name: "Orbital Cartography for Research Literature" }).waitFor();
  await measureFps("syntheticDemo21Nodes3d");

  await page.goto(`${BASE}${SNAPSHOT}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1, name: "Attention is All you Need" }).waitFor();
  await measureFps("snapshot100Nodes3d");

  await measureFilterLatency();
} finally {
  await browser.close();
}

await writeFile(
  path.join(process.cwd(), "qa", "perf.json"),
  `${JSON.stringify(result, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify(result, null, 2));
