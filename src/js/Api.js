class Api {
	constructor(baseUrl) {
		this.baseUrl = baseUrl || "";
		this.token = null;
	}

	setToken(token) {
		this.token = token;
	}

	_headers() {
		const h = { "Content-Type": "application/json" };
		if (this.token) h.Authorization = `Bearer ${this.token}`;
		return h;
	}

	async _request(method, path, body) {
		const res = await fetch(`${this.baseUrl}${path}`, {
			method,
			headers: this._headers(),
			body: body ? JSON.stringify(body) : undefined,
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
		return res.json();
	}

	signup(payload) {
		return this._request("POST", "/api/auth/signup", payload);
	}
	login(payload) {
		return this._request("POST", "/api/auth/login", payload);
	}
	me() {
		return this._request("GET", "/api/auth/me");
	}
	createRecord(payload) {
		return this._request("POST", "/api/records", payload);
	}
	listRecords() {
		return this._request("GET", "/api/records");
	}
	postWatchMetric(payload) {
		return this._request("POST", "/api/watch/metrics", payload);
	}
	latestWatchMetric() {
		return this._request("GET", "/api/watch/latest");
	}
	joinTeam(payload) {
		return this._request("POST", "/api/team/join", payload);
	}
	myTeam() {
		return this._request("GET", "/api/team/me");
	}
}
