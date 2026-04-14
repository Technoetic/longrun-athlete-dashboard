import { chromium } from "playwright";

const URL = "https://longrun-coach-dashboard-production.up.railway.app/pages/login.html";
const EMAIL = "e2e1776175003698@test.com";
const PW = "password123";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.fill("#loginEmail", EMAIL);
await page.fill("#loginPw", PW);
await page.click("#loginBtn");
await page.waitForURL("**/dashboard.html", { timeout: 10000 });
await page.waitForTimeout(2500);

const cardCount = await page.$$eval(".player-card", (els) => els.length);
console.log("player-card 개수:", cardCount);

const firstName = await page.$eval(
	".player-card:first-child .player-name",
	(el) => el.textContent,
);
console.log("첫 선수:", firstName);

await page.click(".player-card:first-child");
await page.waitForTimeout(1500);

const rings = await page.evaluate(() => ({
	recovery: document.getElementById("rRecoveryVal")?.textContent,
	sleep: document.getElementById("rSleepVal")?.textContent,
	strain: document.getElementById("rStrainVal")?.textContent,
}));
console.log("ring 값:", rings);

const weeklySleepFirst = await page.evaluate(() => {
	const weekly = document.getElementById("viewWeekly");
	if (!weekly) return null;
	const lists = weekly.querySelectorAll(".dp-list");
	const sleepList = lists[2];
	if (!sleepList) return null;
	const items = sleepList.querySelectorAll("li .dp-list-val");
	return items[0]?.textContent;
});
console.log("weekly 수면 첫 항목:", weeklySleepFirst);

// chat-panel visibility check: bottom offset + in-viewport
const chatState = await page.evaluate(() => {
	const panel = document.getElementById("chatPanel");
	if (!panel) return { exists: false };
	const rect = panel.getBoundingClientRect();
	const style = window.getComputedStyle(panel);
	return {
		exists: true,
		hasOpenClass: panel.classList.contains("open"),
		bottom: style.bottom,
		zIndex: style.zIndex,
		topVisible: rect.top,
		heightAboveViewport: rect.top < window.innerHeight,
	};
});
console.log("chat-panel 상태:", chatState);

// player-list stacking behind panel (intended blur)
const listStack = await page.evaluate(() => {
	const list = document.querySelector(".player-list");
	const panel = document.querySelector(".panel.open");
	return {
		panelOpen: !!panel,
		panelZ: panel ? window.getComputedStyle(panel).zIndex : null,
		listZ: list ? window.getComputedStyle(list).zIndex : null,
		overlayZ: (() => {
			const o = document.querySelector(".panel-overlay.show");
			return o ? window.getComputedStyle(o).zIndex : null;
		})(),
	};
});
console.log("stacking:", listStack);

await page.screenshot({
	path: "c:/Users/Admin/Desktop/워치/scripts/coach-dashboard-final.png",
	fullPage: false,
});

await browser.close();
console.log("\n스크린샷: scripts/coach-dashboard-final.png");
