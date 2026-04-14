import { chromium } from "playwright";

const URL =
	"https://longrun-coach-dashboard-production.up.railway.app/pages/onboarding.html";

const browser = await chromium.launch();
const ctx = await browser.newContext({
	viewport: { width: 1280, height: 900 },
});
const page = await ctx.newPage();

console.log("=== 1. onboarding.html 로드 ===");
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
console.log("URL:", page.url());

const skipVisible = await page.locator("button.btn-skip:has-text('건너뛰기')").isVisible();
console.log("건너뛰기 버튼 visible:", skipVisible);

await page.screenshot({
	path: "c:/Users/Admin/Desktop/워치/scripts/onboarding-before-skip.png",
});

console.log("\n=== 2. 건너뛰기 클릭 ===");
await page.click("button.btn-skip:has-text('건너뛰기')");
await page.waitForTimeout(1500);
console.log("클릭 후 URL:", page.url());

const isLogin = page.url().includes("login.html");
const isSignup = page.url().includes("signup.html");
console.log("→ login.html:", isLogin);
console.log("→ signup.html:", isSignup);

await page.screenshot({
	path: "c:/Users/Admin/Desktop/워치/scripts/onboarding-after-skip.png",
});

console.log("\n=== 3. 페이지 확인 ===");
const hasEmailInput = await page.locator("#loginEmail").isVisible();
const hasSignupField = await page.locator("#email").isVisible().catch(() => false);
console.log("loginEmail 필드 있음:", hasEmailInput);
console.log("signup #email 필드 있음:", hasSignupField);

const sessionNav = await page.evaluate(() => sessionStorage.getItem("lr_nav"));
console.log("sessionStorage.lr_nav:", sessionNav);

await browser.close();

console.log(
	"\n결과:",
	isLogin && hasEmailInput ? "✓ PASS (login 페이지로 이동)" : "✗ FAIL",
);
