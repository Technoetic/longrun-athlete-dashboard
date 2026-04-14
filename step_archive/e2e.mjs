import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const url = pathToFileURL(resolve(root, "dist/index.html")).href;

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

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForSelector(".screen.active", { state: "visible" });

try {
	// 1. Onboarding 1 visible
	await page.waitForSelector("#screen-ob1.active", { timeout: 2000 });
	record("onboarding1 visible");

	// 2. Click 다음 → ob2
	await page.click("#screen-ob1 .btn-primary");
	await page.waitForSelector("#screen-ob2.active", { timeout: 2000 });
	record("ob1 → ob2");

	// 3. ob2 → ob3
	await page.click("#screen-ob2 .btn-primary");
	await page.waitForSelector("#screen-ob3.active", { timeout: 2000 });
	record("ob2 → ob3");

	// 4. ob3 → login
	await page.click("#screen-ob3 .btn-primary");
	await page.waitForSelector("#screen-login.active", { timeout: 2000 });
	record("ob3 → login");

	// 5. Reject empty login
	await page.click("#screen-login .btn-primary");
	await page.waitForFunction(
		() => document.querySelector(".toast.show.error") !== null,
		{ timeout: 2000 },
	);
	record("login rejects empty");

	// 6. Successful login
	await page.fill("#loginEmail", "test@example.com");
	await page.fill("#loginPw", "password");
	await page.click("#screen-login .btn-primary");
	await page.waitForSelector("#screen-home.active", { timeout: 2000 });
	record("login success → home");

	// 7. Home shows nickname
	const homeName = await page.textContent("#homeName");
	record("home nickname", homeName === "test님", `got: ${homeName}`);

	// 8. Watch toggle on
	await page.click(".watch-card");
	await page.waitForFunction(
		() => document.querySelector(".watch-status.connected") !== null,
		{ timeout: 2000 },
	);
	record("watch connect");

	// 9. Intensity select
	await page.click(".intensity-btn:nth-child(5)");
	await page.waitForSelector("#intensityResult:not([style*='display: none'])", {
		timeout: 2000,
	});
	const intensityVal = await page.textContent("#intensityResultValue");
	record("intensity select", intensityVal === "5", `got: ${intensityVal}`);

	// 10. Submit
	await page.click(".submit-bar .btn-primary");
	await page.waitForFunction(
		() =>
			document.querySelector(".toast.show") &&
			!document.querySelector(".toast.show.error"),
		{ timeout: 2000 },
	);
	record("submit daily");

	// 11. Profile navigation
	await page.click("#homeAvatar");
	await page.waitForSelector("#screen-profile.active", { timeout: 2000 });
	record("home → profile");

	// 12. Logout flow
	await page.click("#screen-profile .btn-secondary");
	await page.waitForSelector("#modal.show", { timeout: 2000 });
	record("logout modal");
} catch (e) {
	record("UNEXPECTED", false, String(e));
}

if (errors.length) {
	for (const e of errors) record(`pageerror: ${e}`, false);
} else {
	record("no page errors");
}

await browser.close();

const passed = results.filter((r) => r.ok).length;
const total = results.length;
console.log(`\n${passed}/${total} passed`);
process.exit(passed === total ? 0 : 1);
