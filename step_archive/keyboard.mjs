import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const url = pathToFileURL(resolve(root, "dist/index.html")).href;
const out = resolve(__dirname, "screenshots/keyboard");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForSelector(".screen.active");

// Skip onboarding
await page.click("#screen-ob1 .btn-text"); // 건너뛰기
await page.waitForSelector("#screen-login.active");
await page.screenshot({ path: `${out}/01-login-before-tab.png` });

// Tab 1: email
await page.keyboard.press("Tab");
const focus1 = await page.evaluate(() => document.activeElement?.id);
await page.screenshot({ path: `${out}/02-tab1-email.png` });
console.log("focus1:", focus1);

// Tab 2: pw
await page.keyboard.press("Tab");
const focus2 = await page.evaluate(() => document.activeElement?.id);
await page.screenshot({ path: `${out}/03-tab2-pw.png` });
console.log("focus2:", focus2);

// Type into email + pw
await page.click("#loginEmail");
await page.keyboard.type("test@example.com");
await page.click("#loginPw");
await page.keyboard.type("password");
await page.screenshot({ path: `${out}/04-typed.png` });

// Enter to submit
await page.click("#screen-login .btn-primary"); // login button
await page.waitForSelector("#screen-home.active");
await page.screenshot({ path: `${out}/05-home.png` });

await browser.close();
console.log("done");
