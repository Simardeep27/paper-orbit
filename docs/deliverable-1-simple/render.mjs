import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const html = path.join(here, "deliverable-1-simple.html");
const pdf = path.join(here, "DELIVERABLE_1.pdf");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1275, height: 1650 }, deviceScaleFactor: 1 });
const failed = [];
page.on("requestfailed", (req) => failed.push(`${req.url()} :: ${req.failure()?.errorText}`));
await page.goto("file://" + html, { waitUntil: "networkidle" });
await page.emulateMedia({ media: "print" });
await page.pdf({ path: pdf, format: "Letter", printBackground: true, margin: { top: "0", right: "0", bottom: "0", left: "0" }, preferCSSPageSize: true });
const count = await page.locator(".page").count();
for (let i = 0; i < count; i++) {
  await page.locator(".page").nth(i).screenshot({ path: path.join(here, `preview-page-${i + 1}.png`) });
}
console.log(JSON.stringify({ pdf, pages: count, failed }, null, 2));
await browser.close();
