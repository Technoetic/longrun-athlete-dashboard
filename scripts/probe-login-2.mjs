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

console.log("=== login.html 직접 접근 ===");
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
console.log("URL:", page.url());
const hasForm = !!(await page.$("#loginEmail"));
console.log("로그인 폼 존재:", hasForm);

if (!hasForm) {
	await browser.close();
	process.exit(1);
}

console.log("\n=== 로그인 시도 ===");
await page.fill("#loginEmail", EMAIL);
await page.fill("#loginPw", PW);
await page.click("#loginBtn");
await page.waitForTimeout(3000);
console.log("로그인 후 URL:", page.url());

const cookies = await ctx.cookies();
const jwt = cookies.find((c) => c.name === "longrun_token");
console.log("longrun_token 쿠키:", jwt ? "있음" : "없음");

const session = await page.evaluate(() => ({
	name: sessionStorage.getItem("lr_user_name"),
	email: sessionStorage.getItem("lr_user_email"),
	sport: sessionStorage.getItem("lr_team_sport"),
	team: sessionStorage.getItem("lr_team_code"),
}));
console.log("sessionStorage:", session);

console.log("\n=== 네트워크 ===");
for (const l of netLog) console.log(l);

await page.screenshot({ path: "c:/Users/Admin/Desktop/워치/scripts/coach-login-verify.png" });
await browser.close();
