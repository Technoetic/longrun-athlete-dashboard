import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const url = pathToFileURL(resolve(root, 'src/index.html')).href;
const out = resolve(__dirname, 'screenshots');
const tag = process.argv[2] || 'r1';

const viewports = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 }
];

const browser = await chromium.launch();
for (const v of viewports) {
  const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('.screen.active', { state: 'visible' });
  await page.waitForTimeout(800);
  const path = `${out}/refactor-verify-${v.name}-${tag}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log('saved', path);
  await ctx.close();
}
await browser.close();
