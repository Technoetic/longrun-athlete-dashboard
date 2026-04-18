(() => {
	const state = new State();
	const toast = new Toast("toast");
	const modal = new Modal("modal", "modalTitle", "modalDesc", "modalActions");
	const router = new Router();
	const api = window.LONGRUN_API_BASE ? new Api(window.LONGRUN_API_BASE) : null;
	const authForm = new AuthForm(state, router, toast, api);
	const phoneVerify = new PhoneVerify(toast);
	const signup = new Signup(state, router, toast, api);
	const watchSim = new WatchSimulator(state, api);
	const intensity = new Intensity(state, toast, api);
	const injury = new Injury();
	const teamCode = new TeamCode(state, modal, toast, api);
	const home = new Home(state);
	const profile = new Profile(state, router, modal, toast, intensity);
	const clock = new Clock("statusTime");

	router.on("home", () => home.init());
	router.on("profile", () => profile.init());

	window.goScreen = (id) => router.go(id);
	window.showToast = (msg, isError) => toast.show(msg, isError);
	window.togglePw = (id, btn) => authForm.togglePw(id, btn);
	window.switchFindTab = (idx, el) => authForm.switchFindTab(idx, el);
	window.handleLogin = () => authForm.handleLogin();
	window.startPhoneVerify = () => phoneVerify.start();
	window.confirmVerify = () => phoneVerify.confirm();
	window.goSignup2 = () => signup.goSignup2();
	window.goSignup3 = () => signup.goSignup3();
	window.goSignup4 = () => signup.goSignup4();
	window.toggleAgreement = (idx) => signup.toggleAgreement(idx);
	window.toggleAllAgreements = () => signup.toggleAllAgreements();
	window.selectSport = (el, name) => signup.selectSport(el, name);
	window.codeNext = (el, idx) => signup.codeNext(el, idx);
	window.completeSignup = () => signup.completeSignup();
	window.toggleWatch = () => watchSim.toggle();
	window.selectIntensity = (val, el) => intensity.select(val, el);
	window.resetIntensity = () => intensity.reset();
	window.submitDaily = () => intensity.submitDaily();
	window.toggleInjuryTag = (el) => injury.toggleTag(el);
	window.showTeamCodeModal = () => teamCode.showModal();
	window.changeTeam = () => teamCode.change();
	window.closeModal = () => modal.close();
	window.handleProfilePhoto = (input) => profile.handlePhoto(input);
	window.changeProfileName = () => profile.changeName();
	window.copyAthleteCode = () => profile.copyAthleteCode();
	window.showPolicyModal = (title) => profile.showPolicyModal(title);
	window.handleLogout = () => profile.handleLogout();
	window.confirmLogout = () => profile.confirmLogout();

	window.manualSync = (ev) => {
		if (ev?.preventDefault) ev.preventDefault();
		const native = window.LongRunNative;
		if (
			window.LONGRUN_NATIVE === true &&
			native &&
			typeof native.requestSync === "function"
		) {
			try {
				const result = native.requestSync();
				toast.show(result ? `동기화: ${result}` : "동기화 요청됨");
			} catch (e) {
				toast.show("동기화 실패", true);
			}
		} else {
			toast.show("네이티브 앱에서만 사용 가능합니다", true);
		}
	};

	if (window.LONGRUN_NATIVE === true) {
		const btn = document.getElementById("manualSyncBtn");
		if (btn) btn.style.display = "";
	}

	clock.start();
	intensity.scheduleMidnightReset();

	// 세션 복원: 서버에 /api/user/me 로 쿠키 유효성 확인 후 유효하면 home 으로 자동 이동.
	// 실패 시 기본 로그인 화면 유지. WebView 쿠키는 앱 종료 시 세션 쿠키가 휘발될 수 있어
	// 서버 세션(Persistent-Auth) 이 남아있는 경우에만 성공한다.
	if (api) {
		api.me()
			.then((user) => {
				if (!user) return;
				state.nickname = user.name || (user.email ? user.email.split("@")[0] : "");
				if (user.player_code) state.athleteCode = user.player_code;
				if (user.team_code) state.teamCode = user.team_code;
				if (user.email) api.currentEmail = user.email;
				router.go("home");
			})
			.catch(() => {
				/* 세션 없음 — 로그인 화면 유지 */
			});
	}
})();
