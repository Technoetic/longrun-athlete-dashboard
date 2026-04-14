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
			// 네이티브 Android 앱 안에서는 시뮬레이션 POST 비활성화
			// (LongRun Android 가 Health Connect 에서 실측값을 직접 전송)
			if (
				window.LONGRUN_NATIVE !== true &&
				this.api &&
				this.api.currentEmail
			) {
				this.api
					.postWatchData({
						heart_rate: hr,
						resting_heart_rate: Math.max(50, hr - 20),
						hrv: 40 + Math.random() * 30,
						blood_oxygen: spo2,
						steps: Math.floor(3000 + Math.random() * 7000),
						sleep_hours: 6 + Math.random() * 2,
						active_calories: 200 + Math.random() * 300,
					})
					.catch(() => {});
			}
		};
		update();
		this.state.watchInterval = setInterval(update, 2000);
	}
}
