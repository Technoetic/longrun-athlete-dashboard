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
		text: async () => (body === null ? "" : JSON.stringify(body)),
		json: async () => body,
	};
}

describe("Api construction", () => {
	it("should default baseUrl to empty string", () => {
		const api = new Api();
		expect(api.baseUrl).toBe("");
		expect(api.currentEmail).toBeNull();
	});

	it("should accept baseUrl", () => {
		const api = new Api("https://api.example.com");
		expect(api.baseUrl).toBe("https://api.example.com");
	});
});

describe("Api.signup", () => {
	it("should POST JSON to /api/auth/signup and remember email", async () => {
		const api = new Api("http://test");
		fetch.mockResolvedValue(mockResponse({ status: "ok", user_id: 1 }));
		await api.signup({
			email: "a@b.com",
			password: "pw",
			name: "kim",
			phone: "010",
		});
		expect(api.currentEmail).toBe("a@b.com");
		const [url, init] = fetch.mock.calls[0];
		expect(url).toBe("http://test/api/auth/signup");
		expect(init.method).toBe("POST");
		expect(init.credentials).toBe("include");
		expect(init.headers["Content-Type"]).toBe("application/json");
		expect(JSON.parse(init.body)).toEqual({
			email: "a@b.com",
			password: "pw",
			name: "kim",
			phone: "010",
		});
	});
});

describe("Api.login", () => {
	it("should POST form-urlencoded with username/password", async () => {
		const api = new Api("http://test");
		fetch.mockResolvedValue(mockResponse({ status: "ok", user_id: 1 }));
		await api.login({ email: "a@b.com", password: "pw" });
		expect(api.currentEmail).toBe("a@b.com");
		const [url, init] = fetch.mock.calls[0];
		expect(url).toBe("http://test/api/auth/login");
		expect(init.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
		expect(init.body).toBe("username=a%40b.com&password=pw");
	});
});

describe("Api.me + updateProfile", () => {
	it("should GET /api/user/me", async () => {
		const api = new Api("http://test");
		fetch.mockResolvedValue(mockResponse({ id: 1, email: "a@b.com" }));
		await api.me();
		const [url, init] = fetch.mock.calls[0];
		expect(url).toBe("http://test/api/user/me");
		expect(init.method).toBe("GET");
	});

	it("should PATCH /api/user/me", async () => {
		const api = new Api("http://test");
		fetch.mockResolvedValue(mockResponse({ id: 1, team_code: "ABCDEF" }));
		await api.updateProfile({ team_code: "ABCDEF", role: "athlete" });
		const [url, init] = fetch.mock.calls[0];
		expect(url).toBe("http://test/api/user/me");
		expect(init.method).toBe("PATCH");
		expect(JSON.parse(init.body).team_code).toBe("ABCDEF");
	});
});

describe("Api.createCondition + createWorkout + createInjury", () => {
	it("should POST conditions with snake_case mapping", async () => {
		const api = new Api("http://test");
		fetch.mockResolvedValue(mockResponse({ id: 1 }));
		await api.createCondition({
			srpe: 7,
			compositeScore: 75,
			fatigue: 6,
		});
		const body = JSON.parse(fetch.mock.calls[0][1].body);
		expect(body.srpe).toBe(7);
		expect(body.composite_score).toBe(75);
		expect(body.fatigue).toBe(6);
	});

	it("should POST workouts with duration_seconds", async () => {
		const api = new Api("http://test");
		fetch.mockResolvedValue(mockResponse({ id: 1 }));
		await api.createWorkout({ name: "훈련", srpe: 5, intensity: "moderate" });
		const body = JSON.parse(fetch.mock.calls[0][1].body);
		expect(body.name).toBe("훈련");
		expect(body.duration_seconds).toBe(0);
		expect(body.intensity).toBe("moderate");
	});

	it("should POST injuries with part_name", async () => {
		const api = new Api("http://test");
		fetch.mockResolvedValue(mockResponse({ id: 1 }));
		await api.createInjury({ partName: "무릎", diagnosis: "통증" });
		const body = JSON.parse(fetch.mock.calls[0][1].body);
		expect(body.part_name).toBe("무릎");
		expect(body.diagnosis).toBe("통증");
	});
});

describe("Api.postWatchData", () => {
	it("should POST watch-data with email", async () => {
		const api = new Api("http://test");
		api.currentEmail = "a@b.com";
		fetch.mockResolvedValue(mockResponse({ status: "ok" }));
		await api.postWatchData({ heart_rate: 80, blood_oxygen: 98, hrv: 45 });
		const body = JSON.parse(fetch.mock.calls[0][1].body);
		expect(body.email).toBe("a@b.com");
		expect(body.heart_rate).toBe(80);
	});

	it("should throw when no email known", async () => {
		const api = new Api("http://test");
		await expect(api.postWatchData({ heart_rate: 80 })).rejects.toThrow(/email/);
	});
});

describe("Api error handling", () => {
	it("should throw on HTTP error with detail", async () => {
		const api = new Api("http://test");
		fetch.mockResolvedValue(mockResponse({ detail: "Bad" }, false, 400));
		await expect(api.signup({ email: "x", password: "y", name: "z" })).rejects.toThrow(
			/400.*Bad/,
		);
	});

	it("should throw on HTTP error without JSON body", async () => {
		const api = new Api("http://test");
		fetch.mockResolvedValue({
			ok: false,
			status: 500,
			statusText: "Server Error",
			text: async () => "",
			json: async () => {
				throw new Error("no body");
			},
		});
		await expect(api.me()).rejects.toThrow(/500.*Server Error/);
	});

	it("should return null for 204", async () => {
		const api = new Api("http://test");
		fetch.mockResolvedValue({
			ok: true,
			status: 204,
			statusText: "No Content",
			text: async () => "",
		});
		const result = await api.logout();
		expect(result).toBeNull();
	});
});
