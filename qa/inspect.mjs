import { chromium } from '@playwright/test';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];
  page.on('console', m => logs.push(`console ${m.type()}: ${m.text()}`));
  page.on('pageerror', e => logs.push(`pageerror: ${e.message}`));
  page.on('requestfailed', r => logs.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', r => { if (r.url().includes('/api/')) logs.push(`api ${r.status()} ${r.url()}`); });
  await page.goto('http://127.0.0.1:3100/explore?center=syn-paper-001&mode=demo', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  console.log('URL', page.url());
  console.log('TITLE', await page.title());
  console.log('H1', await page.locator('h1').allTextContents());
  console.log('BODY', (await page.locator('body').innerText()).slice(0, 1800));
  console.log('LOGS', logs.join('\n'));
  await page.screenshot({ path: 'qa/screenshots/explorer-desktop-2.png', fullPage: false });
} finally {
  await browser.close();
}
