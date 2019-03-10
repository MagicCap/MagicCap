// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.
// Copyright (C) Leo Nesfield <leo@thelmgn.com> 2019.

let { config: localConfig, saveConfig } = require("./config");
global.config = localConfig;
global.saveConfig = saveConfig;
// Defines the config.

const { readdir, readFile } = require("fs-nextra");
let capture = require(`${__dirname}/capture.js`);
const { app, Tray, Menu, dialog, globalShortcut, BrowserWindow, ipcMain, clipboard } = require("electron");
const notifier = require("node-notifier");
const autoUpdateLoop = require(`${__dirname}/autoupdate.js`);
const i18n = require("./i18n");
const { showShortener } = require("./shortener");
const Sentry = require("@sentry/electron");
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

const createMenu = async() => {
	const application = {
		label: await i18n.getPoPhrase("Application", "app"),
		submenu: [
			{
				label: await i18n.getPoPhrase("Quit", "app"),
				accelerator: "Command+Q",
				click: () => {
					app.quit();
				},
			},
		],
	};
	const edit = {
		label: await i18n.getPoPhrase("Edit", "app"),
		submenu: [
			{
				label: await i18n.getPoPhrase("Undo", "app"),
				accelerator: "CmdOrCtrl+Z",
				selector: "undo:",
			},
			{
				label: await i18n.getPoPhrase("Redo", "app"),
				accelerator: "Shift+CmdOrCtrl+Z",
				selector: "redo:",
			},
			{
				type: "separator",
			},
			{
				label: await i18n.getPoPhrase("Cut", "app"),
				accelerator: "CmdOrCtrl+X",
				selector: "cut:",
			},
			{
				label: await i18n.getPoPhrase("Copy", "app"),
				accelerator: "CmdOrCtrl+C",
				selector: "copy:",
			},
			{
				label: await i18n.getPoPhrase("Paste", "app"),
				accelerator: "CmdOrCtrl+V",
				selector: "paste:",
			},
			{
				label: await i18n.getPoPhrase("Select All", "app"),
				accelerator: "CmdOrCtrl+A",
				selector: "selectAll:",
			},
		],
	};
	Menu.setApplicationMenu(Menu.buildFromTemplate([application, edit]));
};
// Creates a menu on Mac.

// Gets configured uploaders (EXCEPT THE DEFAULT UPLOADER!).
function getConfiguredUploaders() {
	const default_uploader = nameUploaderMap[localConfig.uploader_type];
	let configured = [];
	for (const uploaderName in importedUploaders) {
		const uploader = importedUploaders[uploaderName];
		if (default_uploader == uploader.name) {
			continue;
		}
		let allOptions = true;
		for (const optionName in uploader.config_options) {
			const option = uploader.config_options[optionName];
			if (!(option.value in localConfig) && option.required && !option.default) {
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

autoUpdateLoop();
// Starts the autoupdate loop.

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

async function runCapture(gif) {
	const filename = await capture.createCaptureFilename(gif);
	try {
		const result = await capture.handleScreenshotting(filename, gif);
		throwNotification(result);
	} catch (err) {
		if (err.message !== "Screenshot cancelled.") {
			await capture.logUpload(filename, false, null, null);
			const translatedMessage = await i18n.getPoPhrase(`${err.message}`, "uploaders/exceptions");
			dialog.showErrorBox("MagicCap", translatedMessage);
		}
	}
}
global.runCapture = runCapture;
// Runs the capture.

async function openConfig() {
	if (window) {
		window.show();
		return;
	}

	if (app.dock) app.dock.show();

	let vibrancy;
	if (process.platform == "darwin") {
		vibrancy = localConfig.light_theme ? "light" : "sidebar";
	} else {
		vibrancy = undefined;
	}

	window = new BrowserWindow({
		width: 1250, height: 600,
		show: false,
		vibrancy: vibrancy,
		backgroundColor: "#00000000",
	});
	if (process.platform !== "darwin") window.setIcon(`${__dirname}/icons/taskbar.png`);
	global.platform = process.platform;
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

ipcMain.on("restartWindow", () => {
	window.close();
	openConfig();
});
// Restart the window on theme change (fixes bug with vibrancy)

ipcMain.on("window-show", () => {
	window.show();
});
// Shows the window.

// Does the dropdown menu uploads.
async function dropdownMenuUpload(uploader) {
	const selectFilei18n = await i18n.getPoPhrase("Select file...", "app");
	await dialog.showOpenDialog({
		title: selectFilei18n,
		multiSelections: false,
		openDirectory: false,
	}, async filePaths => {
		if (filePaths) {
			const path = filePaths[0];
			const extension = path.split(".").pop().toLowerCase();
			const buffer = await readFile(path);
			const filename = path
				.split("\\")
				.pop()
				.split("/")
				.pop();
			let url;
			try {
				url = await uploader.upload(buffer, extension, filename);
			} catch (err) {
				if (err.message !== "Screenshot cancelled.") {
					await capture.logUpload(filename, false, null, null);
					dialog.showErrorBox("MagicCap", `${err.message}`);
				}
				return;
			}
			const successi18n = await i18n.getPoPhrase("The file specified was uploaded successfully.", "app");
			throwNotification(successi18n);
			if (localConfig.clipboard_action == 2) {
				clipboard.writeText(url);
			}
			await capture.logUpload(filename, true, url, path);
		}
	});
}

// Creates the context menu.
const createContextMenu = async() => {
	let c = localConfig;
	let uploadDropdown = [];
	const defaulti18n = await i18n.getPoPhrase("(Default)", "app");
	if (nameUploaderMap[c.uploader_type] in importedUploaders) {
		const defaultRealName = nameUploaderMap[c.uploader_type];
		uploadDropdown.push(
			{
				label: `${defaultRealName} ${defaulti18n}`,
				type: "normal",
				click: async() => { await dropdownMenuUpload(importedUploaders[defaultRealName]); },
			}
		);
	}
	for (const uploader of getConfiguredUploaders()) {
		uploadDropdown.push(
			{
				label: uploader.name,
				type: "normal",
				click: async() => { await dropdownMenuUpload(uploader); },
			}
		);
	}
	const i18nSelect = await i18n.getPoPhrase("Screen Capture", "app");
	const i18nGif = await i18n.getPoPhrase("GIF Capture", "app");
	const i18nConfig = await i18n.getPoPhrase("Config", "app");
	const i18nUploadTo = await i18n.getPoPhrase("Upload to...", "app");
	const i18nShort = await i18n.getPoPhrase("Shorten Link...", "app");
	const i18nExit = await i18n.getPoPhrase("Exit", "app");
	const contextMenu = Menu.buildFromTemplate([
		{ label: i18nSelect, type: "normal", click: async() => { await runCapture(false); } },
		{ label: i18nGif, type: "normal", click: async() => { await runCapture(true); } },
		{ label: i18nConfig, type: "normal", click: openConfig },
		{ label: i18nShort, type: "normal", click: showShortener },
		{ label: i18nUploadTo, submenu: uploadDropdown },
		{ label: i18nExit, type: "normal", role: "quit" },
	]);
	tray.setContextMenu(contextMenu);
};

const initialiseScript = async() => {
	Sentry.configureScope(scope => {
		scope.setUser({ id: localConfig.install_id });
	});

	tray = new Tray(`${__dirname}/icons/taskbar.png`);
	await createContextMenu();
	if (process.platform === "darwin") createMenu();

	if (localConfig.hotkey) {
		try {
			globalShortcut.register(localConfig.hotkey, async() => {
				thisShouldFixMacIssuesAndIdkWhy();
				await runCapture(false);
			});
		} catch (_) {
			dialog.showErrorBox("MagicCap", await i18n.getPoPhrase("The hotkey you gave was invalid.", "app"));
		}
	}

	if (localConfig.gif_hotkey) {
		try {
			globalShortcut.register(localConfig.gif_hotkey, async() => {
				thisShouldFixMacIssuesAndIdkWhy();
				await runCapture(true);
			});
		} catch (_) {
			dialog.showErrorBox("MagicCap", await i18n.getPoPhrase("The hotkey you gave was invalid.", "app"));
		}
	}
};
// Initialises the script.

ipcMain.on("show-short", () => {
	showShortener();
});
// Shows the link shortener.

ipcMain.on("config-edit", async(event, data) => {
	global.config = data;
	localConfig = data;
	await createContextMenu();
});
// When the config changes, this does.

ipcMain.on("hotkey-change", async(event, c) => {
	try {
		globalShortcut.unregisterAll();
		if (c.hotkey) {
			globalShortcut.register(c.hotkey, async() => {
				thisShouldFixMacIssuesAndIdkWhy();
				await runCapture(false);
			});
		}
		if (c.gif_hotkey) {
			globalShortcut.register(c.gif_hotkey, async() => {
				thisShouldFixMacIssuesAndIdkWhy();
				await runCapture(true);
			});
		}
	} catch (_) {
		dialog.showErrorBox("MagicCap", await i18n.getPoPhrase("The hotkey you gave was invalid.", "app"));
	}
});
// Handles the hotkey changing.

ipcMain.on("get-uploaders", event => { event.returnValue = importedUploaders; });
// The get uploaders IPC.

app.on("ready", initialiseScript);
// The app is ready to rock!

process.on("unhandledRejection", async err => console.error(err));
// Handles unhandled rejections.

const shouldExit = !app.requestSingleInstanceLock();
if (shouldExit) {
	app.quit();
}
// Makes the app a single instance app.

app.on("second-instance", () => {
	openConfig();
});
// If a second instance is spawned, open the config.
