import { chromium } from "playwright";

const URL = "https://longrun-coach-dashboard-production.up.railway.app/pages/login.html";
const EMAIL = "e2e1776175003698@test.com";
const PW = "password123";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.fill("#loginEmail", EMAIL);
await page.fill("#loginPw", PW);
await page.click("#loginBtn");
await page.waitForURL("**/dashboard.html", { timeout: 10000 });
await page.waitForTimeout(2500);

// 1. Player card count
const cardCount = await page.$$eval(".player-card", (els) => els.length);
console.log("player-card 개수:", cardCount);

const playerNames = await page.$$eval(".player-name", (els) =>
	els.map((el) => el.textContent),
);
console.log("선수 이름 목록:", playerNames);

// 2. Old mock names must be absent
const mockLeftover = playerNames.filter((n) =>
	["김하늘", "박도윤", "이서연", "최수아", "정민준"].includes(n),
);
console.log("목업 잔존:", mockLeftover.length === 0 ? "없음 ✓" : mockLeftover);

// 3. Summary bar
const summary = await page.evaluate(() => ({
	g: document.getElementById("sumG")?.textContent,
	y: document.getElementById("sumY")?.textContent,
	r: document.getElementById("sumR")?.textContent,
	d: document.getElementById("sumD")?.textContent,
}));
console.log("summary:", summary);

// 4. Click first card → weekly panel
if (cardCount > 0) {
	const firstName = playerNames[0];
	await page.click(".player-card:first-child");
	await page.waitForTimeout(1500);
	const weeklyName = await page.textContent("#weeklyName");
	console.log("weeklyName:", weeklyName);
	console.log("첫 카드 이름과 일치:", weeklyName.includes(firstName));

	const rings = await page.evaluate(() => ({
		recovery: document.getElementById("rRecoveryVal")?.textContent,
		sleep: document.getElementById("rSleepVal")?.textContent,
		strain: document.getElementById("rStrainVal")?.textContent,
	}));
	console.log("ring 값:", rings);
}

await page.screenshot({
	path: "c:/Users/Admin/Desktop/워치/scripts/coach-dashboard-real.png",
	fullPage: false,
});
await browser.close();
console.log("\n스크린샷 저장: scripts/coach-dashboard-real.png");
