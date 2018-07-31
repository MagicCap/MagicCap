// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

const { stat, writeJSON, mkdir } = require("fs-nextra");
const capture = require("./capture.js");
const { app, Tray, Menu, dialog, globalShortcut, BrowserWindow } = require("electron");
const notifier = require("node-notifier");
// Main imports.

async function getDefaultConfig() {
	let pics_dir = app.getPath("pictures");
	switch (process.platform) {
		case "linux":
		case "darwin": {
			pics_dir += "/MagicCap/";
			break;
		}
		default: {
			pics_dir += "\\MagicCap\\";
		}
	}
	let config = {
		hotkey: null,
		upload_capture: true,
		uploader_type: "imgur",
		clipboard_action: 2,
		save_capture: true,
		save_path: pics_dir,
	};
	await mkdir(config.save_path).catch(async error => {
		if (error.errno !== -4075) {
			config.Remove("save_path");
		}
	});
	return config;
}
// Creates the default config.

(async() => {
	await stat(`${require("os").homedir()}/magiccap.json`).then(async() => {
		const config = global.config = require(`${require("os").homedir()}/magiccap.json`);
	}).catch(async() => {
		const config = global.config = await getDefaultConfig();
		writeJSON(`${require("os").homedir()}/magiccap.json`, config).catch(async() => {
			throw new Error("Could not find or create the config file.");
		});
	});
	await stat(`${require("os").homedir()}/magiccap_captures.json`).then(async() => {
		const captures = global.captures = require(`${require("os").homedir()}/magiccap_captures.json`);
	}).catch(async() => {
		const captures = global.captures = [];
		writeJSON(`${require("os").homedir()}/magiccap_captures.json`, []).catch(async() => {
			throw new Error("Could not find or create the capture logging file.");
		});
	});
	if (config.hotkey) {
		globalShortcut.register(config.hotkey, runCapture);
	}
})();
// Creates the configs.

if (app.dock) app.dock.hide();
// Hides the dock icon.

let tray, window;
// Predefines the task tray and window.

function throwNotification(result) {
	notifier.notify({
		title: "MagicCap",
		message: result,
	});
}
// Throws a notification.

async function runCapture() {
	const filename = await capture.createCaptureFilename();
	try {
		const result = await capture.handleScreenshotting(filename);
		throwNotification(result);
	} catch (err) {
		await capture.logUpload(filename, false, null, null);
		dialog.showErrorBox("MagicCap", `${err.message}`);
	}
}
// Runs the capture.

function openConfig() {
	if (window) {
		window.show();
		return;
	}

	if (app.dock) app.dock.show();

	window = new BrowserWindow({
		width: 800, height: 600,
	});
	window.loadFile("./gui/index.html");

	window.on("closed", () => {
		window = null;
		if (app.dock) app.dock.hide();
	});
}
// Opens the config.

app.on("activate", () => {
	openConfig();
});
// Opens up the config when clicked in the dock.

app.on("window-all-closed", () => {
	// Nothing should happen here.
});
// Stays alive.

function initialiseScript() {
	tray = new Tray(`${__dirname}/icons/taskbar.png`);
	const contextMenu = Menu.buildFromTemplate([
		{ label: "Exit", type: "normal", role: "quit" },
		{ label: "Config", type: "normal", click: openConfig },
		{ label: "Capture", type: "normal", click: runCapture },
	]);
	tray.setContextMenu(contextMenu);
}
// Initialises the script.

app.on("ready", initialiseScript);
// The app is ready to rock!

process.on("unhandledRejection", async err => console.error(err));
// Handles unhandled rejections.
