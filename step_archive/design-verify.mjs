import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const url = pathToFileURL(resolve(root, "dist/index.html")).href;
const out = resolve(__dirname, "screenshots/design");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForSelector(".screen.active");

// Skip onboarding → login → signup1
await page.click("#screen-ob1 .btn-text");
await page.waitForSelector("#screen-login.active");
await page.click("text=회원가입");
await page.waitForSelector("#screen-signup1.active");
await page.waitForTimeout(500); await page.screenshot({ path: `${out}/signup1.png` });

await page.fill("#signNick", "철수");
await page.fill("#signEmail", "kim@x.com");
await page.fill("#signPw", "abcdefgh");
await page.fill("#signPw2", "abcdefgh");
await page.click("#screen-signup1 .btn-primary:has-text('다음')");
await page.waitForSelector("#screen-signup2.active");
await page.waitForTimeout(500); await page.screenshot({ path: `${out}/signup2.png` });

// Check all required agreements
for (let i = 0; i < 4; i++) {
	await page.click(`[data-agree="${i}"]`);
}
await page.click("#screen-signup2 .btn-primary");
await page.waitForSelector("#screen-signup3.active");
await page.waitForTimeout(500); await page.screenshot({ path: `${out}/signup3.png` });

await page.click(".sport-card:nth-child(5)"); // 축구
await page.click("#screen-signup3 .btn-primary");
await page.waitForSelector("#screen-signup4.active");
await page.waitForTimeout(500); await page.screenshot({ path: `${out}/signup4.png` });

await browser.close();
console.log("done");
