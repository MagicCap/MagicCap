// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

const configtemplate = {
	hotkey: "",
	novus_token: "",
};

const { stat, writeJSON } = require("fs-nextra");
const capture = require("./capture.js");
const { app, Tray, Menu, dialog, Notification } = require("electron");
const notifier = require("node-notifier");
// Main imports.

async function createConfigs() {
	await stat(`${require("os").homedir()}/magiccap.json`).then(async() => {
		const config = global.config = require(`${require("os").homedir()}/magiccap.json`);
	}).catch(async() => {
		const config = global.config = configtemplate;
		writeJSON(`${require("os").homedir()}/magiccap.json`, configtemplate).catch(async() => {
			throw new Error("Could not find or create the config file.");
		});
	});
	await stat(`${require("os").homedir()}/magiccap_captures.json`).then(async() => {
		const captures = global.captures = require(`${require("os").homedir()}/magiccap_captures.json`);
	}).catch(async() => {
		const captures = global.captures = { captures: [] };
		writeJSON(`${require("os").homedir()}/magiccap_captures.json`, { captures: [] }).catch(async() => {
			throw new Error("Could not find or create the capture logging file.");
		});
	});
}
createConfigs();
// Creates the configs

if (app.dock) app.dock.hide();
// Hides the dock icon.

let tray;
// Predefines the task tray.

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

function initialiseScript() {
	tray = new Tray(`${__dirname}/icons/taskbar.png`);
	const contextMenu = Menu.buildFromTemplate([
		{ label: "Exit", type: "normal", role: "quit" },
		{ label: "Capture", type: "normal", click: runCapture },
	]);
	tray.setContextMenu(contextMenu);
}
// Initialises the script.

app.on("ready", initialiseScript);
// The app is ready to rock!
