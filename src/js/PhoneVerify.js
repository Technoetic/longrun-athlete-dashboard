class PhoneVerify {
	constructor(toast) {
		this.toast = toast;
		this.intervalId = null;
	}
	start() {
		document.getElementById("verifyCodeGroup").style.display = "";
		this.toast.show("인증번호가 발송되었습니다");
		let sec = 180;
		clearInterval(this.intervalId);
		this.intervalId = setInterval(() => {
			sec--;
			const m = Math.floor(sec / 60);
			const s = sec % 60;
			document.getElementById("verifyTimer").textContent =
				`남은 시간 ${m}:${s.toString().padStart(2, "0")}`;
			if (sec <= 0) clearInterval(this.intervalId);
		}, 1000);
	}
	confirm() {
		clearInterval(this.intervalId);
		document.getElementById("verifyTimer").textContent = "";
		this.toast.show("전화번호가 인증되었습니다");
	}
}
