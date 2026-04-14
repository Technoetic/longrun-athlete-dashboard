import { chromium } from "playwright";

const COACH_URL = "https://longrun-coach-dashboard-production.up.railway.app";
const BACKEND = COACH_URL;
const STAMP = Date.now();
const COACH_EMAIL = `cta${STAMP}@test.com`;
const COACH_PW = "password123";

const browser = await chromium.launch();
const ctx = await browser.newContext({
	viewport: { width: 1280, height: 900 },
});
const page = await ctx.newPage();
const netLog = [];
page.on("request", (req) => {
	if (req.url().includes("/api/")) netLog.push(`→ ${req.method()} ${req.url().replace(BACKEND, "")}`);
});
page.on("response", (res) => {
	if (res.url().includes("/api/")) netLog.push(`← ${res.status()} ${res.url().replace(BACKEND, "")}`);
});
page.on("pageerror", (e) => console.log("[pageerror]", e));

// 1. Create coach account via backend API directly
console.log("=== 1. coach 계정 API 로 생성 ===");
{
	const r = await page.request.post(`${BACKEND}/api/auth/signup`, {
		data: { email: COACH_EMAIL, password: COACH_PW, name: "ctacoach" },
	});
	console.log("signup:", r.status());
	const p = await page.request.patch(`${BACKEND}/api/user/me`, {
		data: { role: "coach" },
	});
	console.log("promote coach:", p.status());
}

// 2. Login via login.html (cookies now set in browser context)
console.log("\n=== 2. login.html 로 로그인 ===");
await page.goto(`${COACH_URL}/pages/login.html`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.fill("#loginEmail", COACH_EMAIL);
await page.fill("#loginPw", COACH_PW);
await page.click("#loginBtn");
await page.waitForURL("**/dashboard.html", { timeout: 10000 });
await page.waitForTimeout(2000);
console.log("URL:", page.url());

// 3. Check for 팀 만들기 CTA
console.log("\n=== 3. 팀 만들기 CTA 확인 ===");
await page.screenshot({
	path: "c:/Users/Admin/Desktop/워치/scripts/cta-before-click.png",
});
const ctaVisible = await page
	.locator("button.btn-add-team:has-text('팀 만들기')")
	.isVisible();
console.log("CTA visible:", ctaVisible);
const emptyText = await page.textContent(".player-empty").catch(() => null);
console.log(".player-empty text:", emptyText?.slice(0, 100));

// 4. Click it
console.log("\n=== 4. 클릭 ===");
if (ctaVisible) {
	await page.click("button.btn-add-team:has-text('팀 만들기')");
	await page.waitForTimeout(2000);
	console.log("클릭 후 URL:", page.url());
	await page.screenshot({
		path: "c:/Users/Admin/Desktop/워치/scripts/cta-after-click.png",
	});
	const isTeamSetup = page.url().includes("team-setup.html");
	console.log("team-setup.html 로 이동했나:", isTeamSetup);
	if (isTeamSetup) {
		// Nav guard가 sessionStorage.lr_nav 검사하는지 확인
		const bodyText = await page.textContent("body");
		console.log("body 첫 200자:", bodyText?.slice(0, 200).replace(/\s+/g, " "));
		const sports = await page.$$(".sport-card");
		console.log("sport-card 개수:", sports.length);
	}
} else {
	console.log("CTA 가 안 보여서 클릭 불가");
}

console.log("\n=== 네트워크 ===");
for (const l of netLog) console.log(l);

await browser.close();
