class WatchSimulator {
	constructor(state) {
		this.state = state;
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
			document.getElementById("hrValue").textContent = Math.floor(
				65 + Math.random() * 30,
			);
			document.getElementById("spo2Value").textContent = Math.floor(
				96 + Math.random() * 4,
			);
			document.getElementById("tempValue").textContent = (
				36.2 +
				Math.random() * 0.8
			).toFixed(1);
		};
		update();
		this.state.watchInterval = setInterval(update, 2000);
	}
}
