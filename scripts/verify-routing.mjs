import { chromium } from "playwright";

const URL =
	"https://longrun-coach-dashboard-production.up.railway.app/pages/onboarding.html";
const BACKEND = "https://longrun-coach-dashboard-production.up.railway.app";

const browser = await chromium.launch();
const ctx = await browser.newContext({
	viewport: { width: 1280, height: 900 },
});
const page = await ctx.newPage();

console.log("=== 1. onboarding.html 접근 ===");
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
console.log("URL:", page.url());
await page.screenshot({
	path: "c:/Users/Admin/Desktop/워치/scripts/routing-1-onboarding.png",
});

// a@a.com 은 athlete 라 coach dashboard 접근 불가.
// 선수 정보가 coach dashboard 에 보이려면 팀장 코치로 로그인해야 함.
// a@a.com 선수가 속한 팀(5BHMPS) 의 코치 = c@c.com (id=40), 비번 모름.
// 대신 test 계정 a@a.com 자체로 login 후 coach/players 시도:
//   - 로그인은 성공하지만 role=athlete 라 coach/players 403.
// 코치 계정이 없으면 coach 대시보드로 "라우팅"은 되지만 데이터는 못 봄.

console.log("\n=== 2. a@a.com 로그인 (선수) ===");
await page.goto(`${BACKEND}/pages/login.html`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.fill("#loginEmail", "a@a.com");
await page.fill("#loginPw", "1234");
await page.click("#loginBtn");
await page.waitForTimeout(2500);
console.log("URL:", page.url());
await page.screenshot({
	path: "c:/Users/Admin/Desktop/워치/scripts/routing-2-login.png",
});

const me = await page.evaluate(async (base) => {
	const r = await fetch(`${base}/api/user/me`, { credentials: "include" });
	return r.ok ? r.json() : { error: r.status };
}, BACKEND);
console.log("/api/user/me:", me);

const players = await page.evaluate(async (base) => {
	const r = await fetch(`${base}/api/coach/players`, { credentials: "include" });
	return { status: r.status, body: r.ok ? await r.json() : await r.text() };
}, BACKEND);
console.log("/api/coach/players:", players);

await browser.close();
