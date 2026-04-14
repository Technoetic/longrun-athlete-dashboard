class Router {
	constructor() {
		this.beforeEnter = {};
	}
	on(screenId, callback) {
		this.beforeEnter[screenId] = callback;
	}
	go(id) {
		if (this.beforeEnter[id]) this.beforeEnter[id]();
		for (const s of document.querySelectorAll(".screen")) {
			s.classList.remove("active");
		}
		const el = document.getElementById("screen-" + id);
		if (el) {
			el.classList.add("active");
			el.style.animation = "none";
			void el.offsetHeight;
			el.style.animation = "";
		}
	}
}
