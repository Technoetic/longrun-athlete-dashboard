class Profile {
	constructor(state, router, modal, toast, intensity) {
		this.state = state;
		this.router = router;
		this.modal = modal;
		this.toast = toast;
		this.intensity = intensity;
	}
	handlePhoto(input) {
		if (input.files?.[0]) {
			const reader = new FileReader();
			reader.onload = (e) => {
				const img = document.getElementById("profileAvatarImg");
				img.src = e.target.result;
				img.style.display = "";
				document.getElementById("profileAvatarText").style.display = "none";
				this.state.profilePhoto = e.target.result;
				const homeAv = document.getElementById("homeAvatar");
				homeAv.innerHTML =
					'<img src="' +
					e.target.result +
					'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
			};
			reader.readAsDataURL(input.files[0]);
		}
	}
	changeName() {
		const name = document.getElementById("profileNickInput").value.trim();
		if (!name) return this.toast.show("이름을 입력하세요", true);
		this.state.nickname = name;
		document.getElementById("profileName").textContent = name + "님";
		document.getElementById("homeName").textContent = name + "님";
		document.getElementById("profileNickInput").value = "";
		this.toast.show("이름이 변경되었습니다");
	}
	copyAthleteCode() {
		const code = this.state.athleteCode || "LR-0000";
		navigator.clipboard
			.writeText(code)
			.then(() => {
				this.toast.show("고유코드가 복사되었습니다");
			})
			.catch(() => {
				this.toast.show("복사에 실패했습니다", true);
			});
	}
	showPolicyModal(title) {
		this.modal.open({
			title,
			descText: "해당 약관의 상세 내용은 서비스 운영 정책에 따라 제공됩니다.",
			actionsHTML:
				'<button class="btn-primary" onclick="closeModal()">확인</button>',
		});
	}
	handleLogout() {
		this.modal.open({
			title: "로그아웃",
			descText: "정말 로그아웃 하시겠습니까?",
			actionsHTML:
				'<button class="btn-secondary" onclick="closeModal()">취소</button>' +
				'<button class="btn-primary" style="background:#ef4444" onclick="confirmLogout()">로그아웃</button>',
		});
	}
	confirmLogout() {
		this.modal.close();
		this.state.nickname = "";
		this.state.athleteCode = "";
		this.state.teamCode = "";
		this.state.intensity = 0;
		this.state.profilePhoto = "";
		this.intensity.reset();
		this.router.go("login");
		this.toast.show("로그아웃 되었습니다");
	}
	init() {
		document.getElementById("profileName").textContent =
			(this.state.nickname || "선수") + "님";
		document.getElementById("profileAthleteCode").textContent =
			this.state.athleteCode || "LR-0000";
		if (this.state.profilePhoto) {
			document.getElementById("profileAvatarImg").src = this.state.profilePhoto;
			document.getElementById("profileAvatarImg").style.display = "";
			document.getElementById("profileAvatarText").style.display = "none";
		} else {
			document.getElementById("profileAvatarImg").style.display = "none";
			document.getElementById("profileAvatarText").style.display = "";
		}
	}
}
