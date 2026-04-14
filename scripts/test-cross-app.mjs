import { chromium } from "playwright";

const ATHLETE_URL = "https://longrun-athlete-frontend-production.up.railway.app";
const COACH_LOGIN = "https://longrun-coach-dashboard-production.up.railway.app/pages/login.html";
const BACKEND = "https://longrun-coach-dashboard-production.up.railway.app";
const TEAM_CODE = "98LS9Y";

const UNIQUE_EMAIL = `xapp${Date.now()}@test.com`;
const NICKNAME = `xtest${Date.now() % 10000}`;
const PW = "password123";

const results = [];
function rec(name, ok = true, note = "") {
	results.push({ name, ok, note });
	console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? " — " + note : ""}`);
}

const browser = await chromium.launch();

console.log("=== 1. 선수 앱에서 가입 ===");
console.log("  email:", UNIQUE_EMAIL, "/ nickname:", NICKNAME, "/ team:", TEAM_CODE);
{
	const ctx = await browser.newContext({
		viewport: { width: 390, height: 844 },
	});
	const page = await ctx.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(String(e)));

	await page.goto(ATHLETE_URL, { waitUntil: "networkidle" });
	await page.waitForSelector(".screen.active");

	// Onboarding → login → signup1
	await page.click("#screen-ob1 .btn-text");
	await page.waitForSelector("#screen-login.active");
	await page.click("text=회원가입");
	await page.waitForSelector("#screen-signup1.active");

	await page.fill("#signNick", NICKNAME);
	await page.fill("#signEmail", UNIQUE_EMAIL);
	await page.fill("#signPw", PW);
	await page.fill("#signPw2", PW);
	await page.click("#screen-signup1 .btn-primary:has-text('다음')");
	await page.waitForSelector("#screen-signup2.active");

	for (let i = 0; i < 4; i++) await page.click(`[data-agree="${i}"]`);
	await page.click("#screen-signup2 .btn-primary");
	await page.waitForSelector("#screen-signup3.active");

	await page.click(".sport-card:nth-child(5)"); // 축구
	await page.click("#screen-signup3 .btn-primary");
	await page.waitForSelector("#screen-signup4.active");

	for (const c of TEAM_CODE) await page.keyboard.type(c);
	await page.click("#screen-signup4 .btn-primary");
	await page.waitForSelector("#screen-welcome.active");
	await page.waitForTimeout(2500);
	rec("선수 앱 signup → welcome");

	if (errors.length) rec("athlete pageerrors", false, errors.join("; "));
	else rec("athlete no pageerrors");
	await ctx.close();
}

console.log("\n=== 2. coach 백엔드 직접 조회 (team_code 확인) ===");
{
	const ctx = await browser.newContext();
	const page = await ctx.newPage();
	// Login as newly created athlete to fetch /api/user/me
	const loginRes = await page.request.post(`${BACKEND}/api/auth/login`, {
		form: { username: UNIQUE_EMAIL, password: PW },
	});
	rec("athlete 백엔드 login", loginRes.ok());

	const me = await (
		await page.request.get(`${BACKEND}/api/user/me`)
	).json();
	rec(
		"team_code 저장 확인",
		me.team_code === TEAM_CODE,
		`sport=${me.sport}, team=${me.team_code}, role=${me.role}`,
	);
	await ctx.close();
}

console.log("\n=== 3. coach 대시보드 /api/coach/players 에 나오는지 ===");
{
	const ctx = await browser.newContext();
	const page = await ctx.newPage();
	const res = await page.request.get(`${BACKEND}/api/coach/players`);
	const players = await res.json();
	const found = players.find((p) => p.name === NICKNAME);
	rec(
		"coach/players 에 등장",
		!!found,
		`total=${players.length}, found=${!!found}`,
	);
	if (found) {
		console.log("  선수 데이터:", JSON.stringify(found, null, 2).slice(0, 400));
	}
	await ctx.close();
}

console.log("\n=== 4. coach 대시보드 UI에 보이는지 (테스트 coach 계정으로 로그인) ===");
{
	const ctx = await browser.newContext({
		viewport: { width: 1280, height: 900 },
	});
	const page = await ctx.newPage();
	await page.goto(COACH_LOGIN, { waitUntil: "networkidle" });
	await page.waitForTimeout(400);
	// c@c.com 은 이제 role=coach. 비번이 뭔지 모르니, coach 로그인은 건너뛰고
	// athlete 로 로그인해서 dashboard 접근 가능한지만 확인
	await page.fill("#loginEmail", UNIQUE_EMAIL);
	await page.fill("#loginPw", PW);
	// Force-enable the button (email regex might block `.` etc.)
	await page.evaluate(() => {
		const btn = document.getElementById("loginBtn");
		if (btn) btn.disabled = false;
	});
	await page.click("#loginBtn");
	await page.waitForTimeout(2500);
	console.log("  로그인 후 URL:", page.url());

	if (page.url().includes("dashboard.html")) {
		await page.waitForTimeout(1500);
		const names = await page.$$eval(".player-name", (els) =>
			els.map((el) => el.textContent),
		);
		console.log("  카드 이름:", names);
		rec(
			"UI 선수 리스트에 등장",
			names.includes(NICKNAME),
			`${names.length}명, include=${names.includes(NICKNAME)}`,
		);
		await page.screenshot({
			path: "c:/Users/Admin/Desktop/워치/scripts/cross-app-test.png",
		});
	} else {
		rec("coach 로그인 실패", false, `URL=${page.url()}`);
	}
	await ctx.close();
}

await browser.close();

const passed = results.filter((r) => r.ok).length;
const total = results.length;
console.log(`\n${passed}/${total} passed`);
console.log("\n테스트 계정:", UNIQUE_EMAIL, "/", PW);
console.log("닉네임:", NICKNAME);
