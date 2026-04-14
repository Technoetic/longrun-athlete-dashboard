import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const url = pathToFileURL(resolve(root, "dist/index.html")).href;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForSelector(".screen.active");

const results = await new AxeBuilder({ page }).analyze();
console.log("violations:", results.violations.length);
for (const v of results.violations) {
	console.log(`- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes)`);
}
await browser.close();
process.exit(results.violations.filter((v) => v.impact === "critical" || v.impact === "serious").length > 0 ? 1 : 0);
