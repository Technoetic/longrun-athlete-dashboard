import { chromium } from "playwright";

const FRONTEND = "https://longrun-athlete-frontend-production.up.railway.app";
const BACKEND = "https://longrun-athlete-api-production.up.railway.app";

const results = [];
function record(name, ok = true, note = "") {
	results.push({ name, ok, note });
	console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? " — " + note : ""}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

try {
	await page.goto(FRONTEND, { waitUntil: "networkidle" });
	await page.waitForSelector(".screen.active", { state: "visible" });
	record("frontend loaded");

	const injected = await page.evaluate(() => window.LONGRUN_API_BASE);
	record("API base injected", injected === BACKEND, `got: ${injected}`);

	// Skip onboarding → login → signup1
	await page.click("#screen-ob1 .btn-text");
	await page.waitForSelector("#screen-login.active");
	await page.click("text=회원가입");
	await page.waitForSelector("#screen-signup1.active");

	const uniqueEmail = `e2eprod${Date.now()}@test.com`;
	await page.fill("#signNick", "prod");
	await page.fill("#signEmail", uniqueEmail);
	await page.fill("#signPw", "password123");
	await page.fill("#signPw2", "password123");
	await page.click("#screen-signup1 .btn-primary:has-text('다음')");
	await page.waitForSelector("#screen-signup2.active");

	for (let i = 0; i < 4; i++) await page.click(`[data-agree="${i}"]`);
	await page.click("#screen-signup2 .btn-primary");
	await page.waitForSelector("#screen-signup3.active");

	await page.click(".sport-card:nth-child(1)");
	await page.click("#screen-signup3 .btn-primary");
	await page.waitForSelector("#screen-signup4.active");

	for (const c of "PROD01") await page.keyboard.type(c);
	await page.click("#screen-signup4 .btn-primary");
	await page.waitForSelector("#screen-welcome.active");
	await page.waitForTimeout(2000);
	record("signup → welcome (API)");

	await page.click("#screen-welcome .btn-primary");
	await page.waitForSelector("#screen-home.active");

	await page.click(".watch-card");
	await page.waitForFunction(
		() => document.querySelector(".watch-status.connected") !== null,
	);
	await page.waitForTimeout(1000);
	record("watch connect + metric POST");

	await page.click(".intensity-btn:nth-child(6)");
	await page.click(".submit-bar .btn-primary");
	await page.waitForFunction(
		() => {
			const el = document.querySelector(".toast.show");
			return el && el.textContent.includes("제출");
		},
		{ timeout: 5000 },
	);
	record("submit daily record (API)");

	// Verify persistence via direct backend fetch
	const loginResp = await fetch(`${BACKEND}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: uniqueEmail, password: "password123" }),
	});
	const { access_token } = await loginResp.json();
	record("backend login", loginResp.ok);

	const recordsResp = await fetch(`${BACKEND}/api/records`, {
		headers: { Authorization: `Bearer ${access_token}` },
	});
	const records = await recordsResp.json();
	record(
		"records persisted",
		records.length >= 1 && records[0].intensity === 6,
		`count=${records.length}, intensity=${records[0]?.intensity}`,
	);

	const watchResp = await fetch(`${BACKEND}/api/watch/latest`, {
		headers: { Authorization: `Bearer ${access_token}` },
	});
	const watch = await watchResp.json();
	record(
		"watch metric persisted",
		watchResp.ok,
		`hr=${watch.heart_rate}, spo2=${watch.spo2}, temp=${watch.temperature}`,
	);

	const teamResp = await fetch(`${BACKEND}/api/team/me`, {
		headers: { Authorization: `Bearer ${access_token}` },
	});
	const team = await teamResp.json();
	record("team joined", teamResp.ok, `code=${team.code}`);

	if (errors.length) {
		for (const e of errors) record(`pageerror: ${e}`, false);
	} else {
		record("no page errors");
	}
} catch (e) {
	record("UNEXPECTED", false, String(e));
} finally {
	await browser.close();
}

const passed = results.filter((r) => r.ok).length;
const total = results.length;
console.log(`\n${passed}/${total} passed`);
process.exit(passed === total ? 0 : 1);
