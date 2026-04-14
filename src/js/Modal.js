class Modal {
	constructor(overlayId, titleId, descId, actionsId) {
		this.overlay = document.getElementById(overlayId);
		this.titleEl = document.getElementById(titleId);
		this.descEl = document.getElementById(descId);
		this.actionsEl = document.getElementById(actionsId);
	}
	open({ title, descHTML, descText, actionsHTML }) {
		this.titleEl.textContent = title;
		if (descHTML !== undefined) this.descEl.innerHTML = descHTML;
		else if (descText !== undefined) this.descEl.textContent = descText;
		this.actionsEl.innerHTML = actionsHTML;
		this.overlay.classList.add("show");
	}
	close() {
		this.overlay.classList.remove("show");
	}
}
