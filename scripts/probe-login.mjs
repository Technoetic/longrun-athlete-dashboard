import { chromium } from "playwright";

const URL = "https://longrun-coach-dashboard-production.up.railway.app/pages/login.html";
const BACKEND = "https://longrun-coach-dashboard-production.up.railway.app";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

const netLog = [];
page.on("request", (req) => {
	if (req.url().includes("/api/")) netLog.push(`→ ${req.method()} ${req.url()}`);
});
page.on("response", (res) => {
	if (res.url().includes("/api/")) netLog.push(`← ${res.status()} ${res.url()}`);
});

console.log("=== 1. 완전 새 세션으로 login 페이지 접속 ===");
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
console.log("현재 URL:", page.url());
console.log("페이지 title:", await page.title());

const cookies = await ctx.cookies();
console.log("쿠키:", cookies.length ? cookies : "없음");

console.log("\n=== 2. /api/user/me 호출 테스트 (쿠키 없이) ===");
const me = await page.evaluate(async (base) => {
	const r = await fetch(`${base}/api/user/me`, { credentials: "include" });
	return { status: r.status, body: r.ok ? await r.json() : await r.text() };
}, BACKEND);
console.log("me 응답:", me);

console.log("\n=== 3. 로그인 페이지 HTML 스냅샷 ===");
const snippet = await page.evaluate(() => {
	const f = document.querySelector("form");
	return f ? f.outerHTML.slice(0, 1500) : "form 없음";
});
console.log(snippet);

console.log("\n=== 4. 네트워크 로그 ===");
for (const l of netLog) console.log(l);

await page.screenshot({ path: "c:/Users/Admin/Desktop/워치/scripts/probe-login.png" });
console.log("\n스크린샷: scripts/probe-login.png");

await browser.close();
