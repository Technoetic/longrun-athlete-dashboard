class Intensity {
	constructor(state, toast, api) {
		this.state = state;
		this.toast = toast;
		this.api = api || null;
	}
	select(val, el) {
		this.state.intensity = val;
		const now = new Date();
		this.state.intensityTime =
			now.getHours().toString().padStart(2, "0") +
			":" +
			now.getMinutes().toString().padStart(2, "0");

		document.querySelectorAll(".intensity-btn").forEach((b) => {
			b.classList.remove("selected");
			b.style.background = "";
			b.style.borderColor = "";
			b.style.boxShadow = "";
		});
		const btns = document.querySelectorAll(".intensity-btn");
		for (let i = 0; i < val; i++) {
			const c = getComputedStyle(btns[i]).getPropertyValue("--c");
			btns[i].style.background = c;
			btns[i].style.borderColor = c;
		}
		el.classList.add("selected");
		el.style.boxShadow =
			"0 0 16px " + getComputedStyle(el).getPropertyValue("--c");

		document.getElementById("intensitySelector").style.display = "none";
		document.getElementById("intensityResult").style.display = "";
		document.getElementById("intensityResultValue").textContent = val;
		document.getElementById("intensityResultValue").style.color =
			getComputedStyle(el).getPropertyValue("--c");
		document.getElementById("intensityResultTime").textContent =
			"선택 시간: " + this.state.intensityTime;
		document.getElementById("intensityResetBtn").style.display = "";
	}
	reset() {
		this.state.intensity = 0;
		this.state.intensityTime = "";
		document.querySelectorAll(".intensity-btn").forEach((b) => {
			b.classList.remove("selected");
			b.style.background = "";
			b.style.borderColor = "";
			b.style.boxShadow = "";
		});
		document.getElementById("intensitySelector").style.display = "";
		document.getElementById("intensityResult").style.display = "none";
		document.getElementById("intensityResetBtn").style.display = "none";
	}
	scheduleMidnightReset() {
		const now = new Date();
		const midnight = new Date(now);
		midnight.setHours(24, 0, 0, 0);
		const msUntilMidnight = midnight - now;
		setTimeout(() => {
			this.reset();
			this.toast.show("00:00 - 운동 강도가 초기화되었습니다");
			this.scheduleMidnightReset();
		}, msUntilMidnight);
	}
	submitDaily() {
		if (!this.state.intensity)
			return this.toast.show("운동 강도를 선택하세요", true);
		if (this.api && this.api.currentEmail) {
			const val = this.state.intensity;
			const tags = Array.from(
				document.querySelectorAll(".injury-tag.selected"),
			).map((el) => el.textContent);
			const note =
				document.querySelector(".injury-textarea")?.value || "";
			const intensityLabel =
				val <= 3 ? "low" : val <= 6 ? "moderate" : val <= 8 ? "high" : "max";
			const tasks = [
				this.api.createCondition({
					srpe: val,
					compositeScore: Math.max(0, 100 - val * 5),
					fatigue: val,
				}),
				this.api.createWorkout({
					name: "일일 훈련",
					srpe: val,
					intensity: intensityLabel,
				}),
			];
			for (const tag of tags) {
				tasks.push(this.api.createInjury({ partName: tag, diagnosis: note }));
			}
			Promise.all(tasks)
				.then(() => this.toast.show("오늘의 기록이 제출되었습니다"))
				.catch((e) => this.toast.show(`제출 실패: ${e.message}`, true));
			return;
		}
		this.toast.show("오늘의 기록이 제출되었습니다");
	}
}
