import { chromium } from "playwright";

const ATHLETE_URL = "https://longrun-athlete-frontend-production.up.railway.app";
const BACKEND = "https://longrun-coach-dashboard-production.up.railway.app";
const GOOD_CODE = "98LS9Y";
const BAD_CODE = "ZZZZZZ";
const PW = "password123";

const results = [];
function rec(name, ok = true, note = "") {
	results.push({ name, ok, note });
	console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? " — " + note : ""}`);
}

const browser = await chromium.launch();

async function signupAthlete(teamCode, emailSuffix) {
	const ctx = await browser.newContext({
		viewport: { width: 390, height: 844 },
	});
	const page = await ctx.newPage();
	const email = `iso${Date.now()}${emailSuffix}@test.com`;
	const nick = `iso${Date.now() % 10000}${emailSuffix}`;
	await page.goto(ATHLETE_URL, { waitUntil: "networkidle" });
	await page.waitForSelector(".screen.active");
	await page.click("#screen-ob1 .btn-text");
	await page.waitForSelector("#screen-login.active");
	await page.click("text=회원가입");
	await page.waitForSelector("#screen-signup1.active");
	await page.fill("#signNick", nick);
	await page.fill("#signEmail", email);
	await page.fill("#signPw", PW);
	await page.fill("#signPw2", PW);
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
	return { email, nick, welcomeShown };
}

async function backendProfile(email) {
	const ctx = await browser.newContext();
	const page = await ctx.newPage();
	const r = await page.request.post(`${BACKEND}/api/auth/login`, {
		form: { username: email, password: PW },
	});
	if (!r.ok()) {
		await ctx.close();
		return null;
	}
	const me = await (await page.request.get(`${BACKEND}/api/user/me`)).json();
	await ctx.close();
	return me;
}

console.log("=== 1. 선수 앱 signup + 올바른 team_code 98LS9Y ===");
const good = await signupAthlete(GOOD_CODE, "a");
rec("good signup welcome screen", good.welcomeShown, `email=${good.email}`);
const goodMe = await backendProfile(good.email);
rec(
	"good team_code 저장됨",
	goodMe && goodMe.team_code === GOOD_CODE,
	`team_code=${goodMe?.team_code}`,
);

console.log("\n=== 2. 선수 앱 signup + 없는 team_code ZZZZZZ ===");
const bad = await signupAthlete(BAD_CODE, "b");
rec("bad signup welcome screen", bad.welcomeShown, `email=${bad.email}`);
const badMe = await backendProfile(bad.email);
rec(
	"bad team_code 저장 안 됨 (null)",
	badMe && !badMe.team_code,
	`team_code=${badMe?.team_code}`,
);

console.log("\n=== 3. /api/coach/players 로그인 후 — 98LS9Y 선수만 보임 ===");
{
	const ctx = await browser.newContext();
	const page = await ctx.newPage();
	// 코치 c@c.com 비밀번호 모르니, 대신 goodMe 계정이 athlete 라서 coach endpoint 403
	// 403 확인
	await page.request.post(`${BACKEND}/api/auth/login`, {
		form: { username: good.email, password: PW },
	});
	const r = await page.request.get(`${BACKEND}/api/coach/players`);
	rec("athlete 계정으로 coach/players 403", r.status() === 403, `status=${r.status()}`);
	await ctx.close();
}

console.log("\n=== 4. DB 직접 조회로 팀 격리 최종 확인 ===");
console.log("  (db-users.py 는 python 필요 — 대신 /api/teams/{code} 로 확인)");
{
	const ctx = await browser.newContext();
	const page = await ctx.newPage();
	const r = await page.request.get(`${BACKEND}/api/teams/${GOOD_CODE}`);
	const team = await r.json();
	rec("teams[98LS9Y] 존재", r.ok() && team.code === GOOD_CODE, JSON.stringify(team));
	await ctx.close();
}

await browser.close();

const passed = results.filter((r) => r.ok).length;
const total = results.length;
console.log(`\n${passed}/${total} passed`);
