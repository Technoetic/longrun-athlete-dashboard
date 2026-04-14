class Api {
	constructor(baseUrl) {
		this.baseUrl = baseUrl || "";
		this.currentEmail = null;
	}

	async _request(method, path, body, opts = {}) {
		const headers = {};
		let payload;
		if (opts.form) {
			headers["Content-Type"] = "application/x-www-form-urlencoded";
			payload = new URLSearchParams(body).toString();
		} else if (body !== undefined) {
			headers["Content-Type"] = "application/json";
			payload = JSON.stringify(body);
		}
		const res = await fetch(`${this.baseUrl}${path}`, {
			method,
			headers,
			body: payload,
			credentials: "include",
		});
		if (!res.ok) {
			let detail = res.statusText;
			try {
				const data = await res.json();
				detail = data.detail || detail;
			} catch (_) {}
			throw new Error(`${res.status}: ${detail}`);
		}
		if (res.status === 204) return null;
		const text = await res.text();
		return text ? JSON.parse(text) : null;
	}

	signup({ email, password, name, phone }) {
		this.currentEmail = email;
		return this._request("POST", "/api/auth/signup", {
			email,
			password,
			name,
			phone,
		});
	}

	login({ email, password }) {
		this.currentEmail = email;
		return this._request(
			"POST",
			"/api/auth/login",
			{ username: email, password },
			{ form: true },
		);
	}

	logout() {
		this.currentEmail = null;
		return this._request("POST", "/api/auth/logout");
	}

	me() {
		return this._request("GET", "/api/user/me");
	}

	updateProfile(payload) {
		return this._request("PATCH", "/api/user/me", payload);
	}

	createCondition({ sleep, fatigue, mood, energy, compositeScore, acwr, srpe }) {
		return this._request("POST", "/api/conditions", {
			sleep,
			fatigue,
			mood,
			energy,
			composite_score: compositeScore,
			acwr,
			srpe,
		});
	}

	createWorkout({ name, durationSeconds = 0, srpe, intensity }) {
		return this._request("POST", "/api/workouts", {
			name,
			duration_seconds: durationSeconds,
			srpe,
			intensity,
		});
	}

	createInjury({ partName, side, diagnosis }) {
		return this._request("POST", "/api/injuries", {
			part_name: partName,
			side,
			diagnosis,
		});
	}

	async postWatchData(data) {
		const email = data.email || this.currentEmail;
		if (!email) throw new Error("email 필요 (로그인 후 호출)");
		return this._request("POST", "/api/watch-data", { ...data, email });
	}

	getBioData() {
		return this._request("GET", "/api/bio-data");
	}
}
