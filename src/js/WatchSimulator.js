class WatchSimulator {
	constructor(state, api) {
		this.state = state;
		this.api = api || null;
	}
	toggle() {
		this.state.watchConnected = !this.state.watchConnected;
		const statusEl = document.getElementById("watchStatus");
		const metricsEl = document.getElementById("watchMetrics");
		if (this.state.watchConnected) {
			statusEl.className = "watch-status connected";
			statusEl.innerHTML =
				'<div class="dot-indicator"></div><span>연결됨</span>';
			metricsEl.style.display = "";
			this.simulate();
		} else {
			statusEl.className = "watch-status disconnected";
			statusEl.innerHTML =
				'<div class="dot-indicator"></div><span>연결 안됨</span>';
			metricsEl.style.display = "none";
			clearInterval(this.state.watchInterval);
			document.getElementById("hrValue").textContent = "--";
			document.getElementById("spo2Value").textContent = "--";
			document.getElementById("tempValue").textContent = "--";
		}
	}
	simulate() {
		const update = () => {
			const hr = Math.floor(65 + Math.random() * 30);
			const spo2 = Math.floor(96 + Math.random() * 4);
			const temp = Number((36.2 + Math.random() * 0.8).toFixed(1));
			document.getElementById("hrValue").textContent = hr;
			document.getElementById("spo2Value").textContent = spo2;
			document.getElementById("tempValue").textContent = temp.toFixed(1);
			if (this.api && this.api.token) {
				this.api
					.postWatchMetric({ heart_rate: hr, spo2, temperature: temp })
					.catch(() => {});
			}
		};
		update();
		this.state.watchInterval = setInterval(update, 2000);
	}
}
