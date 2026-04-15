// Phase 1 M4 end-to-end verification: log into dashboard as athlete
// (전문준, id=39) via an injected JWT cookie, click the single self-player
// card, open the weekly DetailPanel, and read back the HR / RHR text.
//
// Usage: node scripts/verify-dashboard-hr.mjs

import { chromium } from "playwright";

const BASE = "https://longrun-coach-dashboard-production.up.railway.app";
const DASHBOARD = `${BASE}/pages/dashboard.html`;
const JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzOSIsImV4cCI6MTc3NjgxOTU2N30.5NVdGlfFrgQMglGZpOn1QLA3dxVMsCgS4X2MyV1wyvg";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

// Inject the JWT cookie before navigating
await ctx.addCookies([
	{
		name: "longrun_token",
		value: JWT,
		domain: "longrun-coach-dashboard-production.up.railway.app",
		path: "/",
		httpOnly: false,
		secure: true,
		sameSite: "Lax",
	},
]);

const page = await ctx.newPage();

// Seed the session storage BEFORE navigating to dashboard.html, because the
// page's inline script checks sessionStorage for `lr_nav === 'dashboard'` and
// redirects away otherwise.
await page.addInitScript(() => {
	sessionStorage.setItem("lr_nav", "dashboard");
	sessionStorage.setItem("lr_user_role", "athlete");
	sessionStorage.setItem("lr_user_name", "전문준");
	sessionStorage.setItem("lr_user_email", "a@a.com");
});

// Log every console message so we can see frontend errors
page.on("console", (msg) => console.log(`[browser ${msg.type()}]`, msg.text()));
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

console.log(">> navigating to dashboard");
await page.goto(DASHBOARD, { waitUntil: "networkidle" });

// Give TeamManager time to fetch /api/coach/players and (on 403) retry /api/bio-data
await page.waitForTimeout(3000);

const cardCount = await page.$$eval(".player-card", (els) => els.length);
console.log(`>> player-card count: ${cardCount}`);

if (cardCount === 0) {
	const listHtml = await page.$eval("#playerList", (el) => el.innerHTML).catch(() => "(no playerList)");
	console.log(">> playerList inner HTML (first 500 chars):");
	console.log(listHtml.slice(0, 500));
	await browser.close();
	process.exit(1);
}

// Click the first (and only) card
console.log(">> clicking first player card");
await page.click(".player-card");
await page.waitForTimeout(1500);

// Check that the weekly overlay is visible
const overlayVisible = await page.$eval(
	"#weeklyOverlay",
	(el) => el.classList.contains("show"),
).catch(() => false);
console.log(`>> weekly overlay shown: ${overlayVisible}`);

// Read the HR / RHR text from the "심박·심혈관" dp-list (first dp-list inside #viewWeekly)
const rowData = await page.evaluate(() => {
	const weekly = document.getElementById("viewWeekly");
	if (!weekly) return { error: "no viewWeekly" };
	const list = weekly.querySelector(".dp-list");
	if (!list) return { error: "no dp-list in viewWeekly" };
	const items = list.querySelectorAll("li");
	return {
		hr: items[0]?.querySelector(".dp-list-val")?.textContent?.trim(),
		rhr: items[1]?.querySelector(".dp-list-val")?.textContent?.trim(),
		walking_hr: items[2]?.querySelector(".dp-list-val")?.textContent?.trim(),
		hrv: items[3]?.querySelector(".dp-list-val")?.textContent?.trim(),
		spo2: items[4]?.querySelector(".dp-list-val")?.textContent?.trim(),
	};
});
console.log(">> dp-list 심박·심혈관:", rowData);

// Take a screenshot for visual proof
await page.screenshot({
	path: "C:/Users/Admin/Desktop/워치/step_archive/dashboard_verified.png",
	fullPage: false,
});
console.log(">> screenshot saved: step_archive/dashboard_verified.png");

await browser.close();

// Verdict
const ok = rowData.hr && rowData.hr.includes("86");
console.log(ok ? "\n✅ SUCCESS: 대시보드에 86 bpm 표시됨" : "\n❌ FAIL: HR 텍스트에 86 없음");
process.exit(ok ? 0 : 2);
