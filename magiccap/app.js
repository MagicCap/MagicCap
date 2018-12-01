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
const { sep } = require("path");
const { readdir } = require("fs-nextra");
// Main imports.

global.importedUploaders = {};
global.nameUploaderMap = {};
// All of the loaded uploaders.

(async() => {
	const files = await readdir(`${__dirname}/uploaders`);
	for (const file in files) {
		const import_ = require(`${__dirname}/uploaders/${files[file]}`);
		importedUploaders[import_.name] = import_;
		nameUploaderMap[files[file].split(".").shift()] = import_.name;
	}
})();
// Loads all of the uploaders.

function thisShouldFixMacIssuesAndIdkWhy() {
	console.log("Running capture hotkey.");
}

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
	pics_dir += `${sep}MagicCap${sep}`;
	let config = {
		hotkey: null,
		upload_capture: true,
		uploader_type: "imgur",
		clipboard_action: 2,
		save_capture: true,
		save_path: pics_dir,
	};
	await mkdir(config.save_path).catch(async error => {
		if (!(error.errno === -4075 || error.errno === -17)) {
			config.Remove("save_path");
		}
	});
	return config;
}
// Creates the default config.

// Gets configured uploaders (EXCEPT THE DEFAULT UPLOADER!).
function getConfiguredUploaders() {
	const default_uploader = nameUploaderMap[config.uploader_type];
	let configured = [];
	for (const uploaderName in importedUploaders) {
		const uploader = importedUploaders[uploaderName];
		if (default_uploader == uploader.name) {
			continue;
		}
		let allOptions = true;
		for (const optionName in uploader.config_options) {
			const option = uploader.config_options[optionName];
			if (!(option.value in config) && option.required && !option.default) {
				allOptions = false;
				break;
			}
		}
		if (allOptions) {
			configured.push(uploader);
		}
	}
	return configured;
}

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
			globalShortcut.register(config.hotkey, async() => {
				thisShouldFixMacIssuesAndIdkWhy();
				await runCapture(false);
			});
		} catch (_) {
			dialog.showErrorBox("MagicCap", "The hotkey you gave was invalid.");
		}
	}
	if (config.window_hotkey) {
		try {
			globalShortcut.register(config.window_hotkey, async() => {
				thisShouldFixMacIssuesAndIdkWhy();
				await runCapture(true);
			});
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
		icon: `${__dirname}/icons/taskbar@2x.png`,
	});
}
// Throws a notification.

async function runCapture(windowedCapture) {
	const filename = await capture.createCaptureFilename();
	try {
		const result = await capture.handleScreenshotting(filename, windowedCapture);
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
		show: false,
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

ipcMain.on("window-show", () => {
	window.show();
});
// Shows the window.

// Does the dropdown menu uploads.
async function dropdownMenuUpload(uploader) {
	// nothing yet
}

// Creates the context menu.
function createContextMenu() {
	const uploadDropdown = [];
	if (nameUploaderMap[config.uploader_type] in importedUploaders) {
		const defaultRealName = nameUploaderMap[config.uploader_type];
		uploadDropdown.push(
			{
				label: `${defaultRealName} (Default)`,
				type: "normal",
				click: async() => { await dropdownMenuUpload(defaultRealName); },
			}
		);
	}
	for (const uploader of getConfiguredUploaders()) {
		uploadDropdown.push(
			{
				label: uploader.name,
				type: "normal",
				click: async() => { await dropdownMenuUpload(uploader.upload); },
			}
		);
	}
	const contextMenu = Menu.buildFromTemplate([
		{ label: "Selection Capture", type: "normal", click: async() => { await runCapture(false); } },
		{ label: "Window Capture", type: "normal", click: async() => { await runCapture(true); } },
		{ label: "Config", type: "normal", click: openConfig },
		{ label: "Upload to...", submenu: uploadDropdown },
		{ label: "Exit", type: "normal", role: "quit" },
	]);
	tray.setContextMenu(contextMenu);
}

function initialiseScript() {
	tray = new Tray(`${__dirname}/icons/taskbar.png`);
	createContextMenu();
	if (process.platform === "darwin") createMenu();
}
// Initialises the script.

ipcMain.on("config-edit", async(event, data) => {
	global.config = data;
});
// When the config changes, this does.

ipcMain.on("hotkey-change", async(event, hotkey) => {
	try {
		globalShortcut.register(hotkey, async() => {
			thisShouldFixMacIssuesAndIdkWhy();
			await runCapture(false);
		});
	} catch (_) {
		dialog.showErrorBox("MagicCap", "The hotkey you gave was invalid.");
	}
});
// Handles the hotkey changing.

ipcMain.on("window-hotkey-change", async(event, hotkey) => {
	try {
		globalShortcut.register(hotkey, async() => {
			thisShouldFixMacIssuesAndIdkWhy();
			await runCapture(true);
		});
	} catch (_) {
		dialog.showErrorBox("MagicCap", "The hotkey you gave was invalid.");
	}
});
// Handles the window hotkey changing.

ipcMain.on("get-uploaders", event => { event.returnValue = importedUploaders; });
// The get uploaders IPC.

ipcMain.on("hotkey-unregister", async event => {
	globalShortcut.unregisterAll();
});
// Unregisters all hotkeys.

app.on("ready", initialiseScript);
// The app is ready to rock!

process.on("unhandledRejection", async err => console.error(err));
// Handles unhandled rejections.

const shouldExit = app.makeSingleInstance(async() => {
	openConfig();
});
if (shouldExit) {
	app.quit();
}
// Makes the app a single instance app.
