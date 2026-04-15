class Signup {
	constructor(state, router, toast, api) {
		this.state = state;
		this.router = router;
		this.toast = toast;
		this.api = api || null;
		this.signEmail = "";
		this.signPw = "";
	}

	goSignup2() {
		const nick = document.getElementById("signNick").value.trim();
		const email = document.getElementById("signEmail").value.trim();
		const pw = document.getElementById("signPw").value;
		const pw2 = document.getElementById("signPw2").value;
		if (!nick) return this.toast.show("닉네임을 입력하세요", true);
		if (!email) return this.toast.show("이메일을 입력하세요", true);
		if (pw.length < 8)
			return this.toast.show("비밀번호 8자 이상 입력하세요", true);
		if (pw !== pw2)
			return this.toast.show("비밀번호가 일치하지 않습니다", true);
		this.state.nickname = nick;
		this.signEmail = email;
		this.signPw = pw;
		this.router.go("signup2");
	}

	toggleAgreement(idx) {
		this.state.agreements[idx] = !this.state.agreements[idx];
		this.updateAgreementUI();
	}
	toggleAllAgreements() {
		const allChecked = this.state.agreements.every((v) => v);
		this.state.agreements = this.state.agreements.map(() => !allChecked);
		this.updateAgreementUI();
	}
	updateAgreementUI() {
		this.state.agreements.forEach((v, i) => {
			const el = document.querySelector(`[data-agree="${i}"]`);
			if (el) el.classList.toggle("checked", v);
		});
		document.getElementById("agreeAll").classList.toggle(
			"checked",
			this.state.agreements.every((v) => v),
		);
	}
	goSignup3() {
		const required = this.state.agreements.slice(0, 4);
		if (!required.every((v) => v))
			return this.toast.show("필수 항목에 모두 동의해주세요", true);
		this.router.go("signup3");
	}

	selectSport(el, name) {
		for (const c of document.querySelectorAll(".sport-card")) {
			c.classList.remove("selected");
		}
		el.classList.add("selected");
		this.state.sport = name;
	}
	goSignup4() {
		if (!this.state.sport)
			return this.toast.show("운동 종목을 선택하세요", true);
		this.router.go("signup4");
		document.getElementById("tc0").focus();
	}

	codeNext(el, idx) {
		if (el.value && idx < 5) document.getElementById("tc" + (idx + 1)).focus();
	}
	getTeamCode() {
		let code = "";
		for (let i = 0; i < 6; i++) code += document.getElementById("tc" + i).value;
		return code.toUpperCase();
	}

	completeSignup() {
		this.state.teamCode = this.getTeamCode();
		const rand = Math.floor(1000 + Math.random() * 9000);
		this.state.athleteCode = "LR-" + rand;

		const showWelcome = () => {
			document.getElementById("welcomeName").textContent =
				this.state.nickname + "님, 환영합니다!";
			document.getElementById("athleteCode").textContent =
				this.state.athleteCode;
			this.router.go("welcome");
		};

		if (this.api && this.signEmail && this.signPw) {
			this.api
				.signup({
					email: this.signEmail,
					password: this.signPw,
					name: this.state.nickname,
				})
				.then(async () => {
					// 프로필 업데이트는 best-effort (team_code 없는 팀은 404)
					try {
						const user = await this.api.updateProfile({
							sport: this.state.sport || undefined,
							team_code: this.state.teamCode || undefined,
							role: "athlete",
						});
						if (user && user.player_code) {
							this.state.athleteCode = user.player_code;
						}
					} catch (e) {
						this.toast.show(`팀 코드 확인: ${e.message}`, true);
						// team_code 검증 실패 시 sport/role 이라도 저장 재시도
						try {
							const user = await this.api.updateProfile({
								sport: this.state.sport || undefined,
								role: "athlete",
							});
							if (user && user.player_code) {
								this.state.athleteCode = user.player_code;
							}
						} catch (_) {}
					}
					showWelcome();
				})
				.catch((e) => this.toast.show(`가입 실패: ${e.message}`, true));
			return;
		}
		showWelcome();
	}
}
