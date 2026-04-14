import { chromium } from "playwright";

const COACH_URL = "https://longrun-coach-dashboard-production.up.railway.app";
const ATHLETE_URL = "https://longrun-athlete-frontend-production.up.railway.app";
const BACKEND = COACH_URL;

const STAMP = Date.now();
const COACH_EMAIL = `coach${STAMP}@test.com`;
const COACH_PW = "password123";
const COACH_NAME = `coach${STAMP}`;
const ATHLETE_EMAIL_IN_TEAM = `athinteam${STAMP}@test.com`;
const ATHLETE_NICK_IN_TEAM = `intm${STAMP}`;
const ATHLETE_EMAIL_NOTEAM = `athnoteam${STAMP}@test.com`;
const ATHLETE_NICK_NOTEAM = `notm${STAMP}`;
const ATHLETE_PW = "password123";

// team code will be captured from TeamSetupApp after signup
let TEAM_CODE = null;

const results = [];
function rec(name, ok = true, note = "") {
	results.push({ name, ok, note });
	console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? " — " + note : ""}`);
}

const browser = await chromium.launch();

// ═══════════════════════════════════════
// STEP A: coach signup + team create (API 직접 호출)
// ═══════════════════════════════════════
console.log("=== A. coach signup + team create (API) ===");
{
	const ctx = await browser.newContext();
	const page = await ctx.newPage();

	// 1. signup via backend API
	const signupRes = await page.request.post(`${BACKEND}/api/auth/signup`, {
		data: {
			email: COACH_EMAIL,
			password: COACH_PW,
			name: COACH_NAME,
		},
	});
	rec("coach signup API", signupRes.ok(), `status=${signupRes.status()}`);

	// 2. promote to coach role (coach 프론트 SignupApp 이 하던 동작을 재현)
	const patchRes = await page.request.patch(`${BACKEND}/api/user/me`, {
		data: { role: "coach" },
	});
	rec("coach role PATCH", patchRes.ok(), `status=${patchRes.status()}`);

	const me = await (await page.request.get(`${BACKEND}/api/user/me`)).json();
	rec("coach role 확인", me.role === "coach", `role=${me.role}`);

	// 3. create team via POST /api/teams
	TEAM_CODE = `T${STAMP}`.toString().slice(-6).toUpperCase();
	const teamRes = await page.request.post(`${BACKEND}/api/teams`, {
		data: { name: "테스트 팀", code: TEAM_CODE },
	});
	rec(
		"POST /api/teams",
		teamRes.ok(),
		`status=${teamRes.status()} code=${TEAM_CODE}`,
	);

	const me2 = await (await page.request.get(`${BACKEND}/api/user/me`)).json();
	rec(
		"coach team_code 저장됨",
		me2.team_code === TEAM_CODE,
		`team_code=${me2.team_code}`,
	);
	await ctx.close();
}

if (!TEAM_CODE) {
	console.log("FATAL: TEAM_CODE not set, aborting");
	await browser.close();
	process.exit(1);
}

// ═══════════════════════════════════════
// STEP B: athlete signup with team code
// ═══════════════════════════════════════
console.log(`\n=== B. athlete signup with team ${TEAM_CODE} ===`);
async function signupAthlete(email, nick, teamCode) {
	const ctx = await browser.newContext({
		viewport: { width: 390, height: 844 },
	});
	const page = await ctx.newPage();
	await page.goto(ATHLETE_URL, { waitUntil: "networkidle" });
	await page.waitForSelector(".screen.active");
	await page.click("#screen-ob1 .btn-text");
	await page.waitForSelector("#screen-login.active");
	await page.click("text=회원가입");
	await page.waitForSelector("#screen-signup1.active");
	await page.fill("#signNick", nick);
	await page.fill("#signEmail", email);
	await page.fill("#signPw", ATHLETE_PW);
	await page.fill("#signPw2", ATHLETE_PW);
	await page.click("#screen-signup1 .btn-primary:has-text('다음')");
	await page.waitForSelector("#screen-signup2.active");
	for (let i = 0; i < 4; i++) await page.click(`[data-agree="${i}"]`);
	await page.click("#screen-signup2 .btn-primary");
	await page.waitForSelector("#screen-signup3.active");
	await page.click(".sport-card:nth-child(1)");
	await page.click("#screen-signup3 .btn-primary");
	await page.waitForSelector("#screen-signup4.active");
	for (const c of teamCode) await page.keyboard.type(c);
	await page.click("#screen-signup4 .btn-primary");
	await page.waitForTimeout(3500);
	const welcomeShown = await page.$("#screen-welcome.active").then((e) => !!e);
	await ctx.close();
	return welcomeShown;
}

const inTeamWelcome = await signupAthlete(
	ATHLETE_EMAIL_IN_TEAM,
	ATHLETE_NICK_IN_TEAM,
	TEAM_CODE,
);
rec("athlete(팀 가입) welcome", inTeamWelcome);

const noTeamWelcome = await signupAthlete(
	ATHLETE_EMAIL_NOTEAM,
	ATHLETE_NICK_NOTEAM,
	"NOPE12",
);
rec("athlete(없는 팀) welcome (best-effort)", noTeamWelcome);

// Verify via direct backend
{
	const ctx = await browser.newContext();
	const page = await ctx.newPage();
	await page.request.post(`${BACKEND}/api/auth/login`, {
		form: { username: ATHLETE_EMAIL_IN_TEAM, password: ATHLETE_PW },
	});
	const me = await (
		await page.request.get(`${BACKEND}/api/user/me`)
	).json();
	rec(
		"팀 가입 선수 team_code 저장됨",
		me.team_code === TEAM_CODE,
		`team_code=${me.team_code}`,
	);
	await ctx.close();
}
{
	const ctx = await browser.newContext();
	const page = await ctx.newPage();
	await page.request.post(`${BACKEND}/api/auth/login`, {
		form: { username: ATHLETE_EMAIL_NOTEAM, password: ATHLETE_PW },
	});
	const me = await (
		await page.request.get(`${BACKEND}/api/user/me`)
	).json();
	rec(
		"없는 팀 선수 team_code null",
		!me.team_code,
		`team_code=${me.team_code}`,
	);
	await ctx.close();
}

// ═══════════════════════════════════════
// STEP C: coach 로그인 후 /api/coach/players
// ═══════════════════════════════════════
console.log("\n=== C. coach /api/coach/players 확인 ===");
{
	const ctx = await browser.newContext();
	const page = await ctx.newPage();
	await page.request.post(`${BACKEND}/api/auth/login`, {
		form: { username: COACH_EMAIL, password: COACH_PW },
	});
	const r = await page.request.get(`${BACKEND}/api/coach/players`);
	rec("coach/players 200", r.ok(), `status=${r.status()}`);
	if (r.ok()) {
		const players = await r.json();
		console.log("  total:", players.length);
		console.log("  names:", players.map((p) => p.name));
		rec(
			"본인 팀 선수 1명만 반환",
			players.length === 1 && players[0].name === ATHLETE_NICK_IN_TEAM,
			`count=${players.length}, name=${players[0]?.name}`,
		);
	}
	await ctx.close();
}

// ═══════════════════════════════════════
// STEP D: athlete 계정으로 coach/players → 403
// ═══════════════════════════════════════
console.log("\n=== D. athlete 계정으로 coach/players → 403 ===");
{
	const ctx = await browser.newContext();
	const page = await ctx.newPage();
	await page.request.post(`${BACKEND}/api/auth/login`, {
		form: { username: ATHLETE_EMAIL_IN_TEAM, password: ATHLETE_PW },
	});
	const r = await page.request.get(`${BACKEND}/api/coach/players`);
	rec("athlete → coach/players 403", r.status() === 403, `status=${r.status()}`);
	await ctx.close();
}

await browser.close();

const passed = results.filter((r) => r.ok).length;
const total = results.length;
console.log(`\n${passed}/${total} passed`);
console.log("\n테스트 자원:");
console.log("  coach:", COACH_EMAIL, "pw:", COACH_PW, "team:", TEAM_CODE);
console.log("  athlete(in team):", ATHLETE_EMAIL_IN_TEAM);
console.log("  athlete(no team):", ATHLETE_EMAIL_NOTEAM);
process.exit(passed === total ? 0 : 1);
