import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const distSrc = resolve(root, "dist/index.html");
const integOut = resolve(root, "dist/index.integration.html");

// Prepend window.LONGRUN_API_BASE = 'http://127.0.0.1:8765' to dist
const html = readFileSync(distSrc, "utf8");
const patched = html.replace(
	"<head>",
	`<head><script>window.LONGRUN_API_BASE="http://127.0.0.1:8765";</script>`,
);
mkdirSync(dirname(integOut), { recursive: true });
writeFileSync(integOut, patched, "utf8");

// Start backend
const pyExe = resolve(root, "backend/.venv/Scripts/python.exe");
const backend = spawn(
	pyExe,
	["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8765"],
	{
		cwd: resolve(root, "backend"),
		stdio: ["ignore", "pipe", "pipe"],
	},
);
backend.stdout.on("data", (d) => process.stdout.write(`[be] ${d}`));
backend.stderr.on("data", (d) => process.stderr.write(`[be] ${d}`));

// Wait for backend to be ready
async function waitHealthy(maxSec = 30) {
	const net = await import("node:net");
	for (let i = 0; i < maxSec; i++) {
		const ok = await new Promise((done) => {
			const socket = net.createConnection({ host: "127.0.0.1", port: 8765 });
			let settled = false;
			const finish = (v) => {
				if (settled) return;
				settled = true;
				socket.destroy();
				done(v);
			};
			socket.on("connect", () => finish(true));
			socket.on("error", (e) => {
				if (i > 0) console.log(`[waitHealthy ${i}] ${e.code || e.message}`);
				finish(false);
			});
			setTimeout(() => finish(false), 1000);
		});
		if (ok) return true;
		await new Promise((r) => setTimeout(r, 1000));
	}
	return false;
}

const results = [];
function record(name, ok = true, note = "") {
	results.push({ name, ok, note });
	console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? " — " + note : ""}`);
}

try {
	console.log("[debug] before waitHealthy");
	const healthy = await waitHealthy();
	console.log("[debug] waitHealthy returned", healthy);
	if (!healthy) throw new Error("backend did not become healthy");
	record("backend healthy");

	const url = pathToFileURL(integOut).href;
	const browser = await chromium.launch();
	const ctx = await browser.newContext({
		viewport: { width: 390, height: 844 },
	});
	const page = await ctx.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(String(e)));

	await page.goto(url, { waitUntil: "networkidle" });
	await page.waitForSelector(".screen.active");

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
	record("signup1 → signup2");

	// Agreements
	for (let i = 0; i < 4; i++) await page.click(`[data-agree="${i}"]`);
	await page.click("#screen-signup2 .btn-primary");
	await page.waitForSelector("#screen-signup3.active");

	// Sport
	await page.click(".sport-card:nth-child(1)");
	await page.click("#screen-signup3 .btn-primary");
	await page.waitForSelector("#screen-signup4.active");

	// Team code
	for (const c of "TEAM01") {
		await page.keyboard.type(c);
	}
	await page.click("#screen-signup4 .btn-primary");
	await page.waitForSelector("#screen-welcome.active");
	await page.waitForTimeout(1000); // wait for API to finish
	record("signup4 → welcome (API)");

	// Enter home
	await page.click("#screen-welcome .btn-primary");
	await page.waitForSelector("#screen-home.active");

	// Connect watch → triggers postWatchMetric
	await page.click(".watch-card");
	await page.waitForFunction(
		() => document.querySelector(".watch-status.connected") !== null,
	);
	await page.waitForTimeout(500);
	record("watch connect");

	// Select intensity
	await page.click(".intensity-btn:nth-child(6)");
	// Submit daily record
	await page.click(".submit-bar .btn-primary");
	await page.waitForFunction(
		() => {
			const el = document.querySelector(".toast.show");
			return el && el.textContent.includes("제출");
		},
		{ timeout: 3000 },
	);
	record("submit daily (API)");

	// Verify backend received data via direct fetch
	const loginResp = await fetch("http://127.0.0.1:8765/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: uniqueEmail, password: "password123" }),
	});
	const loginData = await loginResp.json();
	record("backend login works", loginResp.ok);

	const recordsResp = await fetch("http://127.0.0.1:8765/api/records", {
		headers: { Authorization: `Bearer ${loginData.access_token}` },
	});
	const recordsData = await recordsResp.json();
	record(
		"records persisted",
		recordsData.length >= 1,
		`count=${recordsData.length}, intensity=${recordsData[0]?.intensity}`,
	);

	const watchResp = await fetch("http://127.0.0.1:8765/api/watch/latest", {
		headers: { Authorization: `Bearer ${loginData.access_token}` },
	});
	const watchData = await watchResp.json();
	record(
		"watch metric persisted",
		watchResp.ok,
		`hr=${watchData.heart_rate}, spo2=${watchData.spo2}`,
	);

	const teamResp = await fetch("http://127.0.0.1:8765/api/team/me", {
		headers: { Authorization: `Bearer ${loginData.access_token}` },
	});
	const teamData = await teamResp.json();
	record("team joined", teamResp.ok, `code=${teamData.code}`);

	if (errors.length) {
		for (const e of errors) record(`pageerror: ${e}`, false);
	} else {
		record("no page errors");
	}

	await browser.close();
} catch (e) {
	record("UNEXPECTED", false, String(e));
} finally {
	backend.kill("SIGKILL");
	try {
		unlinkSync(integOut);
	} catch (_) {}
}

const passed = results.filter((r) => r.ok).length;
const total = results.length;
console.log(`\n${passed}/${total} passed`);
process.exit(passed === total ? 0 : 1);
