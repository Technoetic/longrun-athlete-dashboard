class Clock {
	constructor(elementId) {
		this.el = document.getElementById(elementId);
	}
	update() {
		const now = new Date();
		this.el.textContent =
			now.getHours().toString().padStart(2, "0") +
			":" +
			now.getMinutes().toString().padStart(2, "0");
	}
	start() {
		this.update();
		setInterval(() => this.update(), 30000);
	}
}
