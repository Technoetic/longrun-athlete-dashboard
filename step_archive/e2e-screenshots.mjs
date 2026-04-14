import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const url = pathToFileURL(resolve(root, "dist/index.html")).href;
const out = resolve(__dirname, "screenshots/e2e");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

async function shot(name) {
	await page.waitForTimeout(300);
	await page.screenshot({ path: `${out}/${name}.png` });
	console.log(`saved ${name}`);
}

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForSelector(".screen.active", { state: "visible" });

await shot("01-onboarding1");
await page.click("#screen-ob1 .btn-primary");
await shot("02-onboarding2");
await page.click("#screen-ob2 .btn-primary");
await shot("03-onboarding3");
await page.click("#screen-ob3 .btn-primary");
await shot("04-login");

await page.fill("#loginEmail", "test@example.com");
await page.fill("#loginPw", "password");
await page.click("#screen-login .btn-primary");
await page.waitForSelector("#screen-home.active");
await shot("05-home");

await page.click(".watch-card");
await page.waitForFunction(
	() => document.querySelector(".watch-status.connected") !== null,
);
await shot("06-watch-connected");

await page.click(".intensity-btn:nth-child(7)");
await shot("07-intensity-7");

await page.click("#homeAvatar");
await page.waitForSelector("#screen-profile.active");
await shot("08-profile");

await page.click("#screen-profile .btn-secondary");
await page.waitForSelector("#modal.show");
await shot("09-logout-modal");

await browser.close();
console.log("done");
