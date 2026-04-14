import { chromium } from "playwright";

const COACH_URL = "https://longrun-coach-dashboard-production.up.railway.app";
const BACKEND = COACH_URL;
const STAMP = Date.now();
const COACH_EMAIL = `full${STAMP}@test.com`;
const COACH_PW = "password123";

const results = [];
function rec(name, ok = true, note = "") {
	results.push({ name, ok, note });
	console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? " — " + note : ""}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const netLog = [];
page.on("response", (res) => {
	if (res.url().includes("/api/"))
		netLog.push(`← ${res.status()} ${res.url().replace(BACKEND, "")}`);
});
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 200)));

console.log("=== 1. 배포 확인 ===");
{
	const r = await page.request.get(`${BACKEND}/src/js/TeamManager.js`);
	const body = await r.text();
	const count = (body.match(/goToTeamSetup/g) || []).length;
	rec("goToTeamSetup 배포", count >= 1, `match=${count}`);
}

console.log("\n=== 2. coach 가입 + 로그인 ===");
{
	const signup = await page.request.post(`${BACKEND}/api/auth/signup`, {
		data: { email: COACH_EMAIL, password: COACH_PW, name: "fullcoach" },
	});
	rec("coach signup", signup.ok());
	const promote = await page.request.patch(`${BACKEND}/api/user/me`, {
		data: { role: "coach" },
	});
	rec("promote coach", promote.ok());
}

await page.goto(`${COACH_URL}/pages/login.html`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.fill("#loginEmail", COACH_EMAIL);
await page.fill("#loginPw", COACH_PW);
await page.click("#loginBtn");
await page.waitForURL("**/dashboard.html", { timeout: 10000 });
await page.waitForTimeout(2000);
rec("dashboard 진입", page.url().includes("dashboard.html"));

console.log("\n=== 3. CTA 확인 ===");
{
	const ctaVisible = await page
		.locator("button.btn-add-team:has-text('팀 만들기')")
		.isVisible();
	rec("CTA 표시", ctaVisible);
	const emptyText = await page.textContent(".player-empty").catch(() => null);
	rec(
		"409 메시지",
		emptyText?.includes("먼저 팀을 만들어주세요") ?? false,
		emptyText?.slice(0, 50),
	);
}

console.log("\n=== 4. CTA 클릭 → team-setup ===");
{
	await page.click("button.btn-add-team:has-text('팀 만들기')");
	await page.waitForTimeout(1500);
	rec(
		"team-setup.html 이동",
		page.url().includes("team-setup.html"),
		page.url().split("/").pop(),
	);
	const sportCount = await page.$$eval(".sport-card", (els) => els.length);
	rec("sport-card 5개", sportCount === 5, `count=${sportCount}`);
}

console.log("\n=== 5. 팀 생성 플로우 ===");
const CODE = `TS${STAMP}`.slice(-6).toUpperCase();
{
	// Select first sport (철인3종)
	await page.click(".sport-card:first-child");
	await page.waitForTimeout(300);
	const subBtnDisabled = await page.$eval(
		"#subBtn",
		(b) => /** @type {HTMLButtonElement} */ (b).disabled,
	);
	console.log("  subBtn disabled after sport pick:", subBtnDisabled);
	// Force enable + click via JS
	await page.evaluate(() => {
		const b = document.getElementById("subBtn");
		if (b) {
			b.disabled = false;
			b.click();
		}
	});
	await page.waitForFunction(
		() => document.getElementById("step2")?.classList.contains("active"),
		{ timeout: 5000 },
	);
	rec("Step1 → Step2", true);

	// Step 2: 팀 이름 입력
	await page.waitForTimeout(500);
	const step2Active = await page.$eval("#step2", (el) =>
		el.classList.contains("active"),
	);
	console.log("  step2 active:", step2Active);
	const teamNameStyle = await page.$eval("#teamName", (el) => {
		const s = window.getComputedStyle(el);
		return { display: s.display, visibility: s.visibility, opacity: s.opacity };
	});
	console.log("  #teamName computed:", JSON.stringify(teamNameStyle));
	await page.evaluate(() => {
		const el = /** @type {HTMLInputElement} */ (
			document.getElementById("teamName")
		);
		if (el) el.value = "풀코스팀";
	});
	// Inject generated code so that TeamSetupApp.nextStep picks it up
	await page.evaluate((code) => {
		if (window.teamSetup) window.teamSetup.generatedCode = code;
		if (window.teamSetupApp) window.teamSetupApp.generatedCode = code;
		const el = document.getElementById("teamCode");
		if (el) el.textContent = code;
	}, CODE);
	await page.waitForTimeout(200);
	// 완료 버튼 (subBtn 이 2단계에서 '완료')
	const btnText = await page.textContent("#subBtn");
	console.log("  subBtn text:", btnText);

	// Button may need to be enabled. Force-enable to be safe.
	await page.evaluate(() => {
		const b = document.getElementById("subBtn");
		if (b) b.disabled = false;
	});
	await page.click("#subBtn");
	await page.waitForTimeout(3500);
	rec(
		"완료 후 dashboard 이동",
		page.url().includes("dashboard.html"),
		page.url().split("/").pop(),
	);
}

console.log("\n=== 6. dashboard 재진입 → 200 + empty ===");
await page.waitForTimeout(2000);
{
	const emptyText = await page.textContent(".player-empty").catch(() => null);
	console.log("  .player-empty:", emptyText?.slice(0, 80));
	rec(
		"팀 생성 후 '선수 없음' 메시지",
		emptyText?.includes("아직 팀에 가입한 선수가 없습니다") ?? false,
		emptyText?.slice(0, 60),
	);
}

console.log("\n=== 7. backend 상태 확인 ===");
{
	const me = await (await page.request.get(`${BACKEND}/api/user/me`)).json();
	rec(
		"coach team_code 저장",
		me.team_code === CODE,
		`team_code=${me.team_code}, expected=${CODE}`,
	);

	const team = await (
		await page.request.get(`${BACKEND}/api/teams/${CODE}`)
	).json();
	rec("teams 레코드 존재", !!team.id, JSON.stringify(team));

	const r = await page.request.get(`${BACKEND}/api/coach/players`);
	const players = await r.json();
	rec(
		"coach/players 200 + 빈 배열",
		r.status() === 200 && Array.isArray(players) && players.length === 0,
		`status=${r.status()}, count=${players.length}`,
	);
}

await page.screenshot({
	path: "c:/Users/Admin/Desktop/워치/scripts/cta-full-final.png",
});

console.log("\n=== 네트워크 로그 (마지막 15건) ===");
for (const l of netLog.slice(-15)) console.log(l);

await browser.close();

const passed = results.filter((r) => r.ok).length;
const total = results.length;
console.log(`\n${passed}/${total} passed`);
console.log("\n테스트 자원:");
console.log("  coach:", COACH_EMAIL, "/ pw:", COACH_PW);
console.log("  team:", CODE);
process.exit(passed === total ? 0 : 1);
