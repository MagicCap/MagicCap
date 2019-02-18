// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Imports the things.
const { BrowserWindow } = require("electron");
const path = require("path");

// Defines the window.
let shortenerWindow = null;

// Spawns the shortener window.
const showShortener = () => {
	if (shortenerWindow) {
		shortenerWindow.show();
		return;
	}
	shortenerWindow = new BrowserWindow({
		width: 500, height: 200,
		show: false, minimizable: false,
		maximizable: false, alwaysOnTop: true,
		minWidth: 500, minHeight: 200,
	});
	if (process.platform !== "darwin") shortenerWindow.setIcon(`${path.join(__dirname, "..")}/icons/taskbar.png`);
	shortenerWindow.setTitle("MagicCap Link Shortener");
	shortenerWindow.loadFile(`${__dirname}/index.html`);

	shortenerWindow.on("closed", () => {
		shortenerWindow = null;
	});

	shortenerWindow.once("ready-to-show", () => {
		shortenerWindow.show();
	});
};

// Exports the showShortener function.
module.exports = { showShortener };
