// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

const sqlite3 = require("sqlite3").verbose();
let captureDatabase = global.captureDatabase = new sqlite3.Database(`${require("os").homedir()}/magiccap_captures.db`);
// Defines the capture database.

const { stat, writeJSON, mkdir } = require("fs-nextra");
const capture = require(`${__dirname}/capture.js`);
const { app, Tray, Menu, dialog, globalShortcut, BrowserWindow, ipcMain } = require("electron");
const notifier = require("node-notifier");
// Main imports.

function createMenu() {
	const application = {
		label: "Application",
		submenu: [
			{
				label: "Quit",
				accelerator: "Command+Q",
				click: () => {
					app.quit();
				},
			},
		],
	};
	const edit = {
		label: "Edit",
		submenu: [
			{
				label: "Undo",
				accelerator: "CmdOrCtrl+Z",
				selector: "undo:",
			},
			{
				label: "Redo",
				accelerator: "Shift+CmdOrCtrl+Z",
				selector: "redo:",
			},
			{
				type: "separator",
			},
			{
				label: "Cut",
				accelerator: "CmdOrCtrl+X",
				selector: "cut:",
			},
			{
				label: "Copy",
				accelerator: "CmdOrCtrl+C",
				selector: "copy:",
			},
			{
				label: "Paste",
				accelerator: "CmdOrCtrl+V",
				selector: "paste:",
			},
			{
				label: "Select All",
				accelerator: "CmdOrCtrl+A",
				selector: "selectAll:",
			},
		],
	};
	Menu.setApplicationMenu(Menu.buildFromTemplate([application, edit]));
}
// Creates a menu on Mac.

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
		global.config = require(`${require("os").homedir()}/magiccap.json`);
	}).catch(async() => {
		global.config = await getDefaultConfig();
		writeJSON(`${require("os").homedir()}/magiccap.json`, config).catch(async() => {
			throw new Error("Could not find or create the config file.");
		});
	});
	if (config.hotkey) {
		try {
			globalShortcut.register(config.hotkey, runCapture);
		} catch (_) {
			dialog.showErrorBox("MagicCap", "The hotkey you gave was invalid.");
		}
	}
	await captureDatabase.run("CREATE TABLE IF NOT EXISTS `captures` (`filename` TEXT NOT NULL, `success` INTEGER NOT NULL, `timestamp` INTEGER NOT NULL, `url` TEXT, `file_path` TEXT);");
})();
// Creates the config/capture DB table.

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
		if (err.message !== "Screenshot cancelled.") {
			await capture.logUpload(filename, false, null, null);
			dialog.showErrorBox("MagicCap", `${err.message}`);
		}
	}
}
global.runCapture = runCapture;
// Runs the capture.

function openConfig() {
	if (window) {
		window.show();
		return;
	}

	if (app.dock) app.dock.show();

	window = new BrowserWindow({
		width: 1250, height: 600,
	});
	if (process.platform !== "darwin") window.setIcon(`${__dirname}/icons/taskbar.png`);
	window.setTitle("MagicCap");
	window.loadFile("./gui/index.html");
	global.window = window;

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
		{ label: "Capture", type: "normal", click: runCapture },
		{ label: "Config", type: "normal", click: openConfig },
		{ label: "Exit", type: "normal", role: "quit" },
	]);
	tray.setContextMenu(contextMenu);
	switch (process.platform) {
		case "darwin": {
			createMenu();
		}
	}
}
// Initialises the script.

ipcMain.on("config-edit", async(event, data) => {
	global.config = data;
});
// When the config changes, this does.

ipcMain.on("hotkey-change", async(event, hotkey) => {
	try {
		globalShortcut.register(hotkey, runCapture);
	} catch (_) {
		dialog.showErrorBox("MagicCap", "The hotkey you gave was invalid.");
	}
});
// Handles the hotkey changing.

ipcMain.on("hotkey-unregister", async event => {
	globalShortcut.unregisterAll();
});
// Unregisters all hotkeys.

app.on("ready", initialiseScript);
// The app is ready to rock!

process.on("unhandledRejection", async err => console.error(err));
// Handles unhandled rejections.
