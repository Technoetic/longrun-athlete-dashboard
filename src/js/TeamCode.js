class TeamCode {
	constructor(state, modal, toast, api) {
		this.state = state;
		this.modal = modal;
		this.toast = toast;
		this.api = api || null;
	}
	showModal() {
		this.modal.open({
			title: "팀 코드 변경",
			descHTML:
				'<input class="form-input" id="newTeamCode" placeholder="새 팀 코드 입력" style="margin-top:8px;text-align:center;letter-spacing:4px;text-transform:uppercase">',
			actionsHTML:
				'<button class="btn-secondary" onclick="closeModal()">취소</button>' +
				'<button class="btn-primary" onclick="changeTeam()">변경</button>',
		});
	}
	change() {
		const code = document
			.getElementById("newTeamCode")
			.value.trim()
			.toUpperCase();
		if (!code) return this.toast.show("팀 코드를 입력하세요", true);
		this.state.teamCode = code;
		document.getElementById("homeTeamName").textContent = "팀 " + code;
		document.getElementById("homeTeamCode").textContent = code;
		this.modal.close();
		this.toast.show("팀이 변경되었습니다");
		if (this.api && this.api.currentEmail) {
			this.api
				.updateProfile({ team_code: code })
				.catch((e) => this.toast.show(`팀 동기화 실패: ${e.message}`, true));
		}
	}
}
