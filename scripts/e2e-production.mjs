import { chromium } from "playwright";

const FRONTEND = "https://longrun-athlete-frontend-production.up.railway.app";
const BACKEND = "https://longrun-coach-dashboard-production.up.railway.app";

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

	const uniqueEmail = `e2e${Date.now()}@test.com`;
	await page.fill("#signNick", "e2euser");
	await page.fill("#signEmail", uniqueEmail);
	await page.fill("#signPw", "password123");
	await page.fill("#signPw2", "password123");
	await page.click("#screen-signup1 .btn-primary:has-text('다음')");
	await page.waitForSelector("#screen-signup2.active");

	// Agreements
	for (let i = 0; i < 4; i++) await page.click(`[data-agree="${i}"]`);
	await page.click("#screen-signup2 .btn-primary");
	await page.waitForSelector("#screen-signup3.active");

	// Sport
	await page.click(".sport-card:nth-child(1)");
	await page.click("#screen-signup3 .btn-primary");
	await page.waitForSelector("#screen-signup4.active");

	// Team code
	for (const c of "AB12CD") await page.keyboard.type(c);
	await page.click("#screen-signup4 .btn-primary");
	await page.waitForSelector("#screen-welcome.active");
	await page.waitForTimeout(2000);
	record("signup → welcome (coach API)");

	// Enter home
	await page.click("#screen-welcome .btn-primary");
	await page.waitForSelector("#screen-home.active");

	// Watch connect → POST /api/watch-data
	await page.click(".watch-card");
	await page.waitForFunction(
		() => document.querySelector(".watch-status.connected") !== null,
	);
	await page.waitForTimeout(1500);
	record("watch connect + POST /api/watch-data");

	// Intensity + injury tag + submit
	await page.click(".intensity-tag:nth-child(1)").catch(() => {});
	await page.click(".intensity-btn:nth-child(7)");
	await page.click(".injury-tag:nth-child(1)"); // 무릎
	await page.click(".submit-bar .btn-primary");
	await page.waitForFunction(
		() => {
			const el = document.querySelector(".toast.show");
			return el && el.textContent.includes("제출");
		},
		{ timeout: 5000 },
	);
	record("submit → conditions + workout + injury");

	// Reuse browser cookies to verify persistence directly
	await page.waitForTimeout(1500);

	// Verify via /api/user/me (cookie already set by signup+login)
	const me = await page.evaluate(async (base) => {
		const r = await fetch(`${base}/api/user/me`, { credentials: "include" });
		return r.ok ? r.json() : { error: r.status };
	}, BACKEND);
	record(
		"GET /api/user/me",
		me && me.email === uniqueEmail,
		`email=${me?.email}, sport=${me?.sport}, team=${me?.team_code}`,
	);

	const conditions = await page.evaluate(async (base) => {
		const r = await fetch(`${base}/api/conditions`, { credentials: "include" });
		return r.ok ? r.json() : { error: r.status };
	}, BACKEND);
	record(
		"conditions persisted",
		Array.isArray(conditions) && conditions.length >= 1,
		`count=${conditions?.length}, latest srpe=${conditions?.[0]?.srpe}`,
	);

	const workouts = await page.evaluate(async (base) => {
		const r = await fetch(`${base}/api/workouts`, { credentials: "include" });
		return r.ok ? r.json() : { error: r.status };
	}, BACKEND);
	record(
		"workouts persisted",
		Array.isArray(workouts) && workouts.length >= 1,
		`count=${workouts?.length}, intensity=${workouts?.[0]?.intensity}`,
	);

	const injuries = await page.evaluate(async (base) => {
		const r = await fetch(`${base}/api/injuries`, { credentials: "include" });
		return r.ok ? r.json() : { error: r.status };
	}, BACKEND);
	record(
		"injuries persisted",
		Array.isArray(injuries) && injuries.length >= 1,
		`count=${injuries?.length}, part=${injuries?.[0]?.part_name}`,
	);

	const bio = await page.evaluate(async (base) => {
		const r = await fetch(`${base}/api/bio-data`, { credentials: "include" });
		return r.ok ? r.json() : { error: r.status };
	}, BACKEND);
	record(
		"bio-data (watch) persisted",
		bio && (bio.latest?.heart_rate || bio.heart_rate),
		`hr=${bio?.latest?.heart_rate || bio?.heart_rate}`,
	);

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
