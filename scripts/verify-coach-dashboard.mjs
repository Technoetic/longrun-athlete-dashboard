import { chromium } from "playwright";

const BACKEND = "https://longrun-coach-dashboard-production.up.railway.app";

const browser = await chromium.launch();
const ctx = await browser.newContext({
	viewport: { width: 1280, height: 900 },
});
const page = await ctx.newPage();

console.log("=== onboarding.html 접근 ===");
await page.goto(`${BACKEND}/pages/onboarding.html`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
console.log("URL:", page.url());

// 건너뛰기 → login
await page.click("button.btn-skip:has-text('건너뛰기')");
await page.waitForTimeout(1000);
console.log("건너뛰기 후 URL:", page.url());

console.log("\n=== 코치 c@c.com 로그인 ===");
await page.fill("#loginEmail", "c@c.com");
await page.fill("#loginPw", "1234");
await page.click("#loginBtn");
await page.waitForTimeout(3000);
console.log("로그인 후 URL:", page.url());

const me = await page.evaluate(async (base) => {
	const r = await fetch(`${base}/api/user/me`, { credentials: "include" });
	return r.ok ? r.json() : { error: r.status };
}, BACKEND);
console.log("me:", me);

const players = await page.evaluate(async (base) => {
	const r = await fetch(`${base}/api/coach/players`, { credentials: "include" });
	return { status: r.status, body: r.ok ? await r.json() : await r.text() };
}, BACKEND);
console.log("\n=== /api/coach/players ===");
console.log("status:", players.status);
console.log("count:", Array.isArray(players.body) ? players.body.length : "N/A");
if (Array.isArray(players.body)) {
	for (const p of players.body) {
		console.log(
			" ",
			p.name,
			"| hr=",
			p.hr,
			"| steps=",
			p.steps,
			"| rhr=",
			p.rhr,
			"| hrv=",
			p.hrv,
			"| score=",
			p.score,
		);
	}
}

await page.waitForTimeout(1500);
await page.screenshot({
	path: "c:/Users/Admin/Desktop/워치/scripts/routing-coach-dashboard.png",
	fullPage: false,
});
console.log("\n스크린샷: scripts/routing-coach-dashboard.png");

await browser.close();
