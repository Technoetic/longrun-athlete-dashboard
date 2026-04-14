// first-screen-check.js
// 범용 첫 화면 UX 체크 — 페이지 로드 직후 무엇이 보이는지 검증
// 프로젝트 무관: HTML 파일 경로를 인자로 받음
//
// 체크 항목:
// 1. 뷰포트 안에 보이는 요소 수
// 2. 스크롤 필요 여부
// 3. 빈 화면 여부
// 4. 콘솔 에러
// 5. 주요 영역별 크롭 스크린샷
//
// 사용법: node harness-eyes/first-screen-check.js [html파일]

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const htmlFile = process.argv[2] || "dist/index.html";

(async () => {
	const browser = await chromium.launch();
	const filePath =
		"file:///" + path.resolve(htmlFile).replace(/\\/g, "/");

	const viewports = [
		{ name: "desktop", width: 1920, height: 1080 },
		{ name: "tablet", width: 768, height: 1024 },
		{ name: "mobile", width: 390, height: 844 },
	];

	const ssDir = path.resolve(".claude/screenshots/first-screen");
	if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });

	const results = {
		timestamp: new Date().toISOString(),
		viewports: {},
	};

	for (const vp of viewports) {
		const page = await browser.newPage({
			viewport: { width: vp.width, height: vp.height },
		});

		const errors = [];
		page.on("pageerror", (err) => errors.push(err.message));

		await page.goto(filePath, {
			waitUntil: "domcontentloaded",
			timeout: 15000,
		});
		await page.waitForTimeout(2000);

		// 전체 스크린샷
		await page.screenshot({
			path: path.join(ssDir, `${vp.name}-full.png`),
			fullPage: false,
		});

		// 뷰포트 내 보이는 요소 분석
		const analysis = await page.evaluate(() => {
			const body = document.body;
			const html = document.documentElement;

			// 스크롤 필요 여부
			const needsScroll =
				body.scrollHeight > window.innerHeight ||
				html.scrollHeight > window.innerHeight;

			// 보이는 텍스트 요소 수
			const allElements = document.querySelectorAll("*");
			let visibleCount = 0;
			let emptyBody = true;
			for (const el of allElements) {
				const rect = el.getBoundingClientRect();
				const style = getComputedStyle(el);
				if (
					rect.width > 0 &&
					rect.height > 0 &&
					style.display !== "none" &&
					style.visibility !== "hidden" &&
					style.opacity !== "0" &&
					rect.top < window.innerHeight &&
					rect.bottom > 0
				) {
					visibleCount++;
					if (el.textContent.trim().length > 0) emptyBody = false;
				}
			}

			// 주요 시맨틱 요소 존재 여부
			const hasHeader = !!document.querySelector("header, [role=banner]");
			const hasMain = !!document.querySelector("main, [role=main]");
			const hasFooter = !!document.querySelector("footer, [role=contentinfo], footer#controls");
			const hasH1 = !!document.querySelector("h1");
			const hasButtons = document.querySelectorAll("button").length;

			return {
				needsScroll,
				visibleElements: visibleCount,
				emptyBody,
				hasHeader,
				hasMain,
				hasFooter,
				hasH1,
				buttonCount: hasButtons,
				bodyHeight: body.scrollHeight,
				viewportHeight: window.innerHeight,
			};
		});

		// 주요 영역 크롭
		const crops = ["header", "main", "footer", "nav"];
		for (const sel of crops) {
			const el = await page.$(sel);
			if (el) {
				try {
					await el.screenshot({
						path: path.join(ssDir, `${vp.name}-${sel}.png`),
					});
				} catch (e) {}
			}
		}

		results.viewports[vp.name] = {
			...analysis,
			consoleErrors: errors,
			pass:
				!analysis.emptyBody &&
				errors.length === 0 &&
				analysis.visibleElements > 5,
		};

		await page.close();
	}

	// 종합 판정
	const allPass = Object.values(results.viewports).every((v) => v.pass);
	results.overallPass = allPass;

	console.log(JSON.stringify(results, null, 2));

	await browser.close();

	if (!allPass) process.exit(1);
})();
