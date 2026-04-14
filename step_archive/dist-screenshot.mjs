import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const url = pathToFileURL(resolve(root, "dist/index.html")).href;
const out = resolve(__dirname, "screenshots");

const viewports = [
	{ name: "desktop", width: 1920, height: 1080 },
	{ name: "tablet", width: 768, height: 1024 },
	{ name: "mobile", width: 390, height: 844 },
];
const browser = await chromium.launch();
const errors = [];
for (const v of viewports) {
	const ctx = await browser.newContext({
		viewport: { width: v.width, height: v.height },
	});
	const page = await ctx.newPage();
	page.on("pageerror", (e) => errors.push(`${v.name}: ${e}`));
	await page.goto(url, { waitUntil: "networkidle" });
	await page.waitForSelector(".screen.active", { state: "visible" });
	await page.waitForTimeout(800);
	await page.screenshot({ path: `${out}/dist-${v.name}-r1.png` });
	await ctx.close();
}
console.log("errors:", errors);
await browser.close();
