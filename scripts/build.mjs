import { readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const srcDir = resolve(root, "src");
const distDir = resolve(root, "dist");

function minifyCss(css) {
	return css
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\s+/g, " ")
		.replace(/\s*([{};:,>])\s*/g, "$1")
		.replace(/;}/g, "}")
		.trim();
}

function minifyJs(js) {
	const lines = js.split(/\r?\n/);
	const out = [];
	for (let line of lines) {
		const trimmed = line.replace(/^\s+/, "").replace(/\s+$/, "");
		if (trimmed === "") continue;
		out.push(trimmed);
	}
	return out.join("\n");
}

function minifyHtml(html) {
	return html
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/^\s+/gm, "")
		.replace(/\n+/g, "\n")
		.trim();
}

let html = readFileSync(resolve(srcDir, "index.html"), "utf8");

html = html.replace(
	/<link\s+rel="stylesheet"\s+href="(css\/[^"]+)">/g,
	(_, href) => {
		const css = readFileSync(resolve(srcDir, href), "utf8");
		return `<style>${minifyCss(css)}</style>`;
	},
);

html = html.replace(
	/<script\s+src="(js\/[^"]+)"><\/script>/g,
	(_, src) => {
		const js = readFileSync(resolve(srcDir, src), "utf8");
		return `<script>${minifyJs(js)}</script>`;
	},
);

const minified = minifyHtml(html);

mkdirSync(distDir, { recursive: true });
const outPath = resolve(distDir, "index.html");
writeFileSync(outPath, minified, "utf8");

const srcSize = statSync(resolve(srcDir, "index.html")).size;
const distSize = statSync(outPath).size;

let cssTotal = 0;
let jsTotal = 0;
for (const f of [
	"base.css",
	"phone.css",
	"buttons.css",
	"forms.css",
	"auth.css",
	"onboarding.css",
	"signup.css",
	"home.css",
	"nav.css",
	"toast-modal.css",
	"profile.css",
	"utility.css",
]) {
	cssTotal += statSync(resolve(srcDir, "css", f)).size;
}
for (const f of [
	"State.js",
	"Toast.js",
	"Modal.js",
	"Router.js",
	"AuthForm.js",
	"PhoneVerify.js",
	"Signup.js",
	"WatchSimulator.js",
	"Intensity.js",
	"Injury.js",
	"TeamCode.js",
	"Home.js",
	"Profile.js",
	"Clock.js",
	"app.js",
]) {
	jsTotal += statSync(resolve(srcDir, "js", f)).size;
}

const stats = {
	timestamp: new Date().toISOString(),
	src: {
		index_html: srcSize,
		css_total: cssTotal,
		js_total: jsTotal,
		grand_total: srcSize + cssTotal + jsTotal,
	},
	dist: {
		index_html: distSize,
	},
	reduction_percent: Number(
		(
			(1 - distSize / (srcSize + cssTotal + jsTotal)) *
			100
		).toFixed(2),
	),
};

writeFileSync(
	resolve(distDir, "build-stats.json"),
	JSON.stringify(stats, null, 2),
	"utf8",
);

console.log(`dist/index.html: ${distSize} bytes`);
console.log(`src total: ${stats.src.grand_total} bytes`);
console.log(`reduction: ${stats.reduction_percent}%`);
