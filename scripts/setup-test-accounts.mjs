import { chromium } from "playwright";

const BACKEND = "https://longrun-coach-dashboard-production.up.railway.app";
const STAMP = Date.now();
const COACH = { email: `coach${STAMP}@test.com`, pw: "password123", name: "coachTest" };
const ATHLETE = { email: `athlete${STAMP}@test.com`, pw: "password123", name: "athleteTest" };
const TEAM_CODE = "TEST99";

const browser = await chromium.launch();

// 코치 생성 + 팀 생성
{
	const ctx = await browser.newContext();
	const page = await ctx.newPage();
	await page.request.post(`${BACKEND}/api/auth/signup`, {
		data: { email: COACH.email, password: COACH.pw, name: COACH.name },
	});
	await page.request.patch(`${BACKEND}/api/user/me`, {
		data: { role: "coach" },
	});
	const r = await page.request.post(`${BACKEND}/api/teams`, {
		data: { name: "검증팀", code: TEAM_CODE },
	});
	console.log("team:", r.status(), await r.text());
	await ctx.close();
}

// 선수 생성 + 팀 가입
{
	const ctx = await browser.newContext();
	const page = await ctx.newPage();
	await page.request.post(`${BACKEND}/api/auth/signup`, {
		data: { email: ATHLETE.email, password: ATHLETE.pw, name: ATHLETE.name },
	});
	const r = await page.request.patch(`${BACKEND}/api/user/me`, {
		data: { role: "athlete", team_code: TEAM_CODE, sport: "축구" },
	});
	console.log("athlete profile:", r.status(), await r.text());
	await ctx.close();
}

await browser.close();

console.log("\n=== 테스트 자원 ===");
console.log("COACH:  ", COACH.email, "/", COACH.pw);
console.log("ATHLETE:", ATHLETE.email, "/", ATHLETE.pw);
console.log("TEAM:   ", TEAM_CODE);
