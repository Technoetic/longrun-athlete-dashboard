import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { loadClass } from "./setup.js";

let Api;
beforeAll(() => {
	Api = loadClass("Api");
});

beforeEach(() => {
	globalThis.fetch = vi.fn();
});
afterEach(() => {
	vi.resetAllMocks();
});

function mockResponse(body, ok = true, status = 200) {
	return {
		ok,
		status,
		statusText: ok ? "OK" : "Error",
		json: async () => body,
	};
}

describe("Api construction", () => {
	it("should default baseUrl to empty string", () => {
		const api = new Api();
		expect(api.baseUrl).toBe("");
		expect(api.token).toBeNull();
	});

	it("should accept baseUrl", () => {
		const api = new Api("https://api.example.com");
		expect(api.baseUrl).toBe("https://api.example.com");
	});

	it("should set token", () => {
		const api = new Api();
		api.setToken("abc");
		expect(api.token).toBe("abc");
	});
});

describe("Api requests", () => {
	it("should POST signup without token", async () => {
		const api = new Api("http://test");
		fetch.mockResolvedValue(mockResponse({ access_token: "t1" }));
		const result = await api.signup({ email: "a@b.com", password: "x" });
		expect(result.access_token).toBe("t1");
		const [url, init] = fetch.mock.calls[0];
		expect(url).toBe("http://test/api/auth/signup");
		expect(init.method).toBe("POST");
		expect(init.headers.Authorization).toBeUndefined();
	});

	it("should include Bearer token when set", async () => {
		const api = new Api("http://test");
		api.setToken("secret");
		fetch.mockResolvedValue(mockResponse({ id: 1 }));
		await api.me();
		const [, init] = fetch.mock.calls[0];
		expect(init.headers.Authorization).toBe("Bearer secret");
	});

	it("should throw on HTTP error with detail", async () => {
		const api = new Api("http://test");
		fetch.mockResolvedValue(
			mockResponse({ detail: "Invalid credentials" }, false, 401),
		);
		await expect(api.login({ email: "x", password: "y" })).rejects.toThrow(
			/401.*Invalid credentials/,
		);
	});

	it("should throw on HTTP error without JSON body", async () => {
		const api = new Api("http://test");
		fetch.mockResolvedValue({
			ok: false,
			status: 500,
			statusText: "Server Error",
			json: async () => {
				throw new Error("no body");
			},
		});
		await expect(api.me()).rejects.toThrow(/500.*Server Error/);
	});

	it("should POST createRecord with body", async () => {
		const api = new Api("http://test");
		api.setToken("t");
		fetch.mockResolvedValue(mockResponse({ id: 1 }));
		await api.createRecord({
			date: "2026-04-14",
			intensity: 7,
			injury_tags: ["무릎"],
			injury_note: "x",
		});
		const [url, init] = fetch.mock.calls[0];
		expect(url).toBe("http://test/api/records");
		expect(init.method).toBe("POST");
		expect(JSON.parse(init.body).intensity).toBe(7);
	});

	it("should GET listRecords without body", async () => {
		const api = new Api("http://test");
		api.setToken("t");
		fetch.mockResolvedValue(mockResponse([]));
		await api.listRecords();
		const [url, init] = fetch.mock.calls[0];
		expect(url).toBe("http://test/api/records");
		expect(init.method).toBe("GET");
		expect(init.body).toBeUndefined();
	});

	it("should POST watch metric", async () => {
		const api = new Api("http://test");
		api.setToken("t");
		fetch.mockResolvedValue(mockResponse({ id: 1 }));
		await api.postWatchMetric({ heart_rate: 80, spo2: 98, temperature: 36.5 });
		const [url, init] = fetch.mock.calls[0];
		expect(url).toBe("http://test/api/watch/metrics");
		expect(JSON.parse(init.body).heart_rate).toBe(80);
	});

	it("should POST joinTeam", async () => {
		const api = new Api("http://test");
		api.setToken("t");
		fetch.mockResolvedValue(mockResponse({ code: "AB12CD" }));
		await api.joinTeam({ team_code: "AB12CD" });
		const [url] = fetch.mock.calls[0];
		expect(url).toBe("http://test/api/team/join");
	});

	it("should return null for 204", async () => {
		const api = new Api("http://test");
		fetch.mockResolvedValue({
			ok: true,
			status: 204,
			statusText: "No Content",
		});
		const result = await api.signup({});
		expect(result).toBeNull();
	});
});
