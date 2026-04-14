import { chromium } from "playwright";

const URL = "https://longrun-coach-dashboard-production.up.railway.app/pages/login.html";
const EMAIL = "e2e1776175003698@test.com";
const PW = "password123";

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

console.log("=== 1. login.html 직접 URL 접근 ===");
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
console.log("현재 URL:", page.url());
const hasForm = await page.$("#loginEmail");
console.log("로그인 폼 존재:", !!hasForm);
await page.screenshot({ path: "c:/Users/Admin/Desktop/워치/scripts/probe-coach-login-01.png" });

if (!hasForm) {
	console.log("FAIL: 폼이 안 보임");
	await browser.close();
	process.exit(1);
}

console.log("\n=== 2. 실 DB 계정으로 로그인 시도 ===");
await page.fill("#loginEmail", EMAIL);
await page.fill("#loginPw", PW);
await page.click("#loginBtn");
await page.waitForTimeout(2500);
console.log("로그인 후 URL:", page.url());

const cookies = await ctx.cookies();
const jwtCookie = cookies.find((c) => c.name === "longrun_token");
console.log("longrun_token 쿠키:", jwtCookie ? "있음" : "없음");

const sessionData = await page.evaluate(() => ({
	name: sessionStorage.getItem("lr_user_name"),
	email: sessionStorage.getItem("lr_user_email"),
	role: sessionStorage.getItem("lr_user_role"),
	sport: sessionStorage.getItem("lr_team_sport"),
	team_code: sessionStorage.getItem("lr_team_code"),
}));
console.log("sessionStorage:", sessionData);

await page.screenshot({ path: "c:/Users/Admin/Desktop/워치/scripts/probe-coach-login-02.png" });

console.log("\n=== 3. 잘못된 비밀번호로 로그인 시도 ===");
const page2 = await ctx.newPage();
await page2.goto(URL, { waitUntil: "networkidle" });
await page2.waitForTimeout(500);
if (await page2.$("#loginEmail")) {
	await page2.fill("#loginEmail", EMAIL);
	await page2.fill("#loginPw", "wrongpassword");
	await page2.click("#loginBtn");
	await page2.waitForTimeout(2000);
	const hint = await page2.$eval("#loginHint", (el) => el.textContent);
	console.log("에러 힌트:", hint);
	console.log("아직 login 페이지:", page2.url().includes("login.html"));
} else {
	console.log("FAIL: 두번째 탭에서 폼 없음 (세션 전파?)");
}

console.log("\n=== 네트워크 로그 ===");
for (const l of netLog) console.log(l);

await browser.close();
