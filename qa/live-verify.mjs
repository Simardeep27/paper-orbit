import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "http://127.0.0.1:3100";
const CENTER = "204e3073870fae3d05bcbc2f6a8e263d9b72e776";
const result = {
  capturedAt: new Date().toISOString(),
  note: "Opt-in credentialed live smoke check against the running production server. No key or header is stored.",
  checks: [],
  neighborhood: null,
  screenshot: null,
};

async function getJson(route) {
  const started = performance.now();
  const response = await fetch(`${BASE}${route}`);
  const body = await response.json().catch(() => null);
  return {
    route,
    status: response.status,
    latencyMs: Math.round(performance.now() - started),
    body,
  };
}

function check(name, status, details) {
  result.checks.push({ name, status, ...details });
}

// Search and identifier resolution.
for (const [label, route, expectedId] of [
  [
    "live search title",
    `/api/search?q=${encodeURIComponent("Attention Is All You Need")}&mode=live`,
    null,
  ],
  [
    "live arXiv ID",
    `/api/resolve?id=${encodeURIComponent("arXiv:1706.03762")}&mode=live`,
    CENTER,
  ],
  [
    "live arXiv URL",
    `/api/resolve?id=${encodeURIComponent("https://arxiv.org/abs/1706.03762")}&mode=live`,
    CENTER,
  ],
  [
    "live DOI",
    `/api/resolve?id=${encodeURIComponent("10.1162/neco.1989.1.2.270")}&mode=live`,
    "ce9a21b93ba29d4145a8ef6bf401e77f261848de",
  ],
  [
    "live DOI URL",
    `/api/resolve?id=${encodeURIComponent("https://doi.org/10.1162/neco.1989.1.2.270")}&mode=live`,
    "ce9a21b93ba29d4145a8ef6bf401e77f261848de",
  ],
  [
    "stored snapshot search",
    `/api/search?q=${encodeURIComponent("attention")}&mode=snapshot`,
    null,
  ],
]) {
  const response = await getJson(route);
  const body = response.body;
  const paper = body?.paper ?? body?.papers?.[0] ?? null;
  const ok =
    response.status === 200 &&
    (expectedId === null || paper?.id === expectedId);
  check(label, ok ? "pass" : "fail", {
    status: response.status,
    latencyMs: response.latencyMs,
    firstTitle: paper?.title ?? null,
    firstId: paper?.id ?? null,
    resultCount: body?.papers?.length ?? null,
    errorCode: body?.error?.code ?? null,
  });
}

// Retry once if a branch was rate limited. The route itself preserves partial branches.
let neighborhood = null;
for (let attempt = 1; attempt <= 2; attempt += 1) {
  const response = await getJson(
    `/api/neighborhood?paperId=${CENTER}&mode=live`,
  );
  const body = response.body;
  const coverage = body?.coverage;
  const allOk =
    response.status === 200 &&
    coverage &&
    ["references", "citing", "recommended"].every(
      (branch) => coverage[branch].status === "ok",
    );
  neighborhood = {
    attempt,
    status: response.status,
    latencyMs: response.latencyMs,
    center:
      body?.nodes?.find((node) => node.paper.id === body.centerId)?.paper
        .title ?? null,
    nodeCount: body?.nodes?.length ?? null,
    coverage: coverage
      ? Object.fromEntries(
          ["references", "citing", "recommended"].map((branch) => [
            branch,
            {
              status: coverage[branch].status,
              received: coverage[branch].receivedEntries,
              distinct: coverage[branch].validDistinctPapers,
              message: coverage[branch].message ?? null,
            },
          ]),
        )
      : null,
    errorCode: body?.error?.code ?? null,
  };
  if (allOk) break;
  if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 35_000));
}
result.neighborhood = neighborhood;
check(
  "live neighborhood",
  neighborhood?.coverage &&
    ["references", "citing", "recommended"].every(
      (branch) => neighborhood.coverage[branch].status === "ok",
    )
    ? "pass"
    : "partial",
  {
    status: neighborhood?.status ?? null,
    latencyMs: neighborhood?.latencyMs ?? null,
    nodeCount: neighborhood?.nodeCount ?? null,
    coverage: neighborhood?.coverage ?? null,
  },
);

// Capture the full live state if the last fetch is complete; otherwise keep the honest partial screenshot.
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));
try {
  await page.goto(`${BASE}/explore?center=${CENTER}&mode=live`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("heading", { level: 1, name: "Attention is All you Need" }).waitFor({
    timeout: 60_000,
  });
  await page.waitForTimeout(900);
  const chip = await page.locator(".viz-status-chip").innerText();
  const branches = await page.locator(".viz-center-meta").innerText();
  const complete = !(await page.locator(".banner-warning").count());
  const name = complete ? "live-3d-full" : "live-3d-partial";
  await page.screenshot({ path: path.join(process.cwd(), "qa", "screenshots", `${name}.png`) });
  result.screenshot = `qa/screenshots/${name}.png`;
  check("live browser inspection", complete ? "pass" : "partial", {
    chip,
    branches,
    warning: complete ? null : await page.locator(".banner-warning").first().innerText(),
    consoleErrors,
  });
} finally {
  await browser.close();
}

await writeFile(
  path.join(process.cwd(), "qa", "live-verification.json"),
  `${JSON.stringify(result, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify(result, null, 2));
