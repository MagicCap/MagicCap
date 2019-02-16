(async() => {
	// Imports the i18n components.
	const i18n = require("../i18n");

	// Translates all the things.
	const parsed = await i18n.poParseHtml(document.documentElement.innerHTML);
	document.documentElement.innerHTML = parsed;

	// Creates the element for the main GUI script.
	const s = document.createElement("script");
	s.src = "./gui.js";
	document.body.appendChild(s);
})();
