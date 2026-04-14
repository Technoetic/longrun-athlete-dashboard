class Toast {
	constructor(elementId) {
		this.el = document.getElementById(elementId);
	}
	show(msg, isError) {
		this.el.textContent = msg;
		this.el.className = "toast show" + (isError ? " error" : "");
		setTimeout(() => {
			this.el.className = "toast";
		}, 2500);
	}
}
