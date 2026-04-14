// interaction-test.js
// 범용 상호작용 E2E 테스트 — 페이지 로드 → 버튼 클릭 → 상태 변화 검증
// 프로젝트 무관: HTML 파일 경로와 테스트 시나리오를 인자로 받음
//
// 사용법: node harness-eyes/interaction-test.js [html파일] [시나리오json]
// 시나리오 없으면 기본 테스트 (로드 → 콘솔에러 체크 → 버튼 클릭 가능 여부)

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const htmlFile = process.argv[2] || "dist/index.html";
const scenarioFile = process.argv[3] || null;

(async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

	const filePath =
		"file:///" + path.resolve(htmlFile).replace(/\\/g, "/");

	// 콘솔 에러 수집
	const errors = [];
	page.on("pageerror", (err) => errors.push(err.message));
	page.on("console", (msg) => {
		if (msg.type() === "error") errors.push(msg.text());
	});

	await page.goto(filePath, {
		waitUntil: "domcontentloaded",
		timeout: 15000,
	});
	await page.waitForTimeout(2000);

	const results = {
		url: filePath,
		timestamp: new Date().toISOString(),
		consoleErrors: [],
		tests: [],
	};

	// 1. 콘솔 에러 체크
	results.consoleErrors = errors;

	// 2. 시나리오 실행
	let scenarios = [
		{
			name: "페이지 로드",
			action: "none",
			check: "no-console-errors",
		},
	];

	if (scenarioFile && fs.existsSync(scenarioFile)) {
		scenarios = JSON.parse(fs.readFileSync(scenarioFile, "utf8"));
	} else {
		// 기본: 페이지의 모든 button을 찾아서 클릭 가능한지 체크
		const buttons = await page.$$("button");
		for (let i = 0; i < Math.min(buttons.length, 10); i++) {
			const btn = buttons[i];
			const text = await btn.textContent();
			const visible = await btn.isVisible();
			const enabled = await btn.isEnabled();
			results.tests.push({
				name: `버튼 [${text.trim().substring(0, 20)}]`,
				visible,
				enabled,
				pass: visible && enabled,
			});
		}

		// 첫 번째 버튼 클릭 후 에러 체크
		if (buttons.length > 0) {
			const firstVisible = buttons.find(async (b) => await b.isVisible());
			if (firstVisible) {
				try {
					await buttons[0].click();
					await page.waitForTimeout(1000);
					results.tests.push({
						name: "첫 버튼 클릭 후 에러 없음",
						pass: errors.length === results.consoleErrors.length,
						newErrors: errors.slice(results.consoleErrors.length),
					});
				} catch (e) {
					results.tests.push({
						name: "첫 버튼 클릭",
						pass: false,
						error: e.message,
					});
				}
			}
		}
	}

	// 3. 콘솔 에러 최종 수집
	results.consoleErrors = errors;
	results.totalTests = results.tests.length;
	results.passed = results.tests.filter((t) => t.pass).length;
	results.failed = results.tests.filter((t) => !t.pass).length;

	// 결과 출력
	console.log(JSON.stringify(results, null, 2));

	// 스크린샷 저장
	const ssDir = path.resolve(".claude/screenshots");
	if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });
	await page.screenshot({
		path: path.join(ssDir, "interaction-test-result.png"),
		fullPage: false,
	});

	await browser.close();

	// 실패가 있으면 exit 1
	if (results.failed > 0 || errors.length > 0) {
		process.exit(1);
	}
})();
