class AuthForm {
	constructor(state, router, toast, api) {
		this.state = state;
		this.router = router;
		this.toast = toast;
		this.api = api || null;
	}
	togglePw(id, btn) {
		const inp = document.getElementById(id);
		if (inp.type === "password") {
			inp.type = "text";
			btn.textContent = "AB";
		} else {
			inp.type = "password";
			btn.textContent = "\u2022\u2022";
		}
	}
	switchFindTab(idx, el) {
		for (const t of document.querySelectorAll("#screen-findAccount .tab-item")) {
			t.classList.remove("active");
		}
		el.classList.add("active");
		document.getElementById("findTab0").style.display = idx === 0 ? "" : "none";
		document.getElementById("findTab1").style.display = idx === 1 ? "" : "none";
	}
	handleLogin() {
		const email = document.getElementById("loginEmail").value.trim();
		const pw = document.getElementById("loginPw").value;
		if (!email || !pw)
			return this.toast.show("이메일과 비밀번호를 입력하세요", true);
		this.state.nickname = email.split("@")[0];
		this.state.athleteCode = "LR-" + Math.floor(1000 + Math.random() * 9000);
		if (this.api) {
			this.api
				.login({ email, password: pw })
				.then((data) => {
					this.api.setToken(data.access_token);
					return this.api.me();
				})
				.then((user) => {
					this.state.nickname = user.nickname;
					this.state.athleteCode = user.athlete_code;
					if (user.team_code) this.state.teamCode = user.team_code;
					this.router.go("home");
				})
				.catch((e) => this.toast.show(`로그인 실패: ${e.message}`, true));
			return;
		}
		this.router.go("home");
	}
}
