// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

const { shell } = require("electron");
const $ = require("jquery");
// Imports go here.

function openMPL() {
	shell.openExternal("https://www.mozilla.org/en-US/MPL/2.0");
}
// Opens the MPL 2.0 license in a browser.

function showAbout() {
	$("#about").addClass("is-active");
}
// Shows the about page.

$("#aboutClose").click(async() => {
	await $("#about").removeClass("is-active");
});
// Handles the close button.
