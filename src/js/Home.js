class Home {
	constructor(state) {
		this.state = state;
	}
	init() {
		document.getElementById("homeName").textContent =
			(this.state.nickname || "선수") + "님";
		if (this.state.teamCode) {
			document.getElementById("homeTeamName").textContent =
				"팀 " + this.state.teamCode;
			document.getElementById("homeTeamCode").textContent = this.state.teamCode;
		}
	}
}
