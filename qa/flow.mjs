import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const out = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];
  page.on('console', m => { if (m.type() === 'error') logs.push(`console error: ${m.text()}`); });
  page.on('pageerror', e => logs.push(`pageerror: ${e.message}`));
  await page.goto('http://127.0.0.1:3100/explore?center=syn-paper-001&mode=demo', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { level: 1, name: /Orbital Cartography/ }).waitFor();
  out.push(`initial title: ${await page.locator('.viz-center-title').innerText()}`);
  out.push(`visible chip: ${await page.locator('.viz-status-chip').innerText()}`);
  out.push(`paper rows: ${await page.locator('.paper-row').count()}`);
  await page.screenshot({ path: 'qa/screenshots/desktop-3d.png' });

  await page.getByRole('button', { name: '2D', exact: true }).click();
  await page.locator('.radial-svg').waitFor();
  await page.waitForTimeout(500);
  out.push(`2D labels: ${await page.locator('.radial-label').count()}`);
  out.push(`2D svg present: ${await page.locator('.radial-svg').isVisible()}`);
  await page.screenshot({ path: 'qa/screenshots/desktop-2d.png' });

  await page.getByRole('button', { name: 'List', exact: true }).click();
  await page.waitForTimeout(300);
  out.push(`list view rows: ${await page.locator('.paper-row').count()}`);
  out.push(`dock tabs: ${await page.locator('.dock-tab').allTextContents()}`);
  await page.screenshot({ path: 'qa/screenshots/desktop-list.png' });

  const fieldGuide = page.locator('.paper-row').filter({ hasText: 'A Field Guide to Citation Neighborhoods' }).first();
  await fieldGuide.locator('.paper-title-btn').click();
  await page.waitForTimeout(300);
  out.push(`selected details title: ${await page.locator('.details-panel h1, .details-panel .details-title').first().innerText().catch(()=>'n/a')}`);
  out.push(`details panel text has field guide: ${(await page.locator('#paper-details').innerText()).includes('A Field Guide')}`);

  await page.getByRole('button', { name: 'Make central paper' }).click();
  await page.getByRole('heading', { level: 1, name: /A Field Guide/ }).waitFor({ timeout: 15000 });
  out.push(`recentered title: ${await page.locator('.viz-center-title').innerText()}`);
  out.push(`url after recenter: ${page.url()}`);

  await page.goBack();
  await page.getByRole('heading', { level: 1, name: /Orbital Cartography/ }).waitFor({ timeout: 15000 });
  out.push(`back title: ${await page.locator('.viz-center-title').innerText()}`);

  // Save center paper to reading list via details.
  await page.getByRole('button', { name: 'Add to reading list' }).click();
  await page.waitForTimeout(200);
  const stored = await page.evaluate(() => localStorage.getItem('paper-orbit:reading-list:v1'));
  out.push(`reading list stored: ${stored ? JSON.parse(stored).items.length : 'none'}`);

  await page.getByRole('link', { name: /Reading list/ }).first().click();
  await page.waitForTimeout(1000);
  out.push(`reading page h1: ${await page.locator('h1').innerText()}`);
  out.push(`reading items: ${await page.locator('.reading-item').count()}`);
  await page.screenshot({ path: 'qa/screenshots/reading-list.png' });

  out.push(`LOGS:\n${logs.join('\n') || 'none'}`);
} finally {
  await browser.close();
}
console.log(out.join('\n'));
