// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

const { shell, remote } = require("electron");
const $ = require("jquery");
const fsnextra = require("fs-nextra");
const xssfilters = require("xss-filters");
let config = global.config;
let lastTimestamp = 0;
let filePathMap = {};
// Imports go here.

async function saveConfig() {
	fsnextra.writeJSON(`${require("os").homedir()}/magiccap.json`, config).catch(async() => {
		console.log("Could not update the config.");
	});
	for (const key in config) {
		remote.getGlobal("config")[key] = config[key];
	}
}
// Saves the config.

let clipboardAction = 2;
if (config.clipboard_action) {
	if (config.clipboard_action <= 0 || config.clipboard_action >= 3) {
		config.clipboard_action = clipboardAction;
		saveConfig();
	} else {
		clipboardAction = config.clipboard_action;
	}
} else {
	config.clipboard_action = clipboardAction;
	saveConfig();
}
$(`#clipboardActionID${clipboardAction}`).prop("checked", true);
// Preloads the clipboard action.

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
// Handles the about close button.

function showClipboardAction() {
	$("#clipboardAction").addClass("is-active");
}
// Shows the clipboard action settings page.

$("#clipboardActionClose").click(async() => {
	await $("#clipboardAction").removeClass("is-active");
});
// Handles the clipboard action close button.

$('[id^="clipboardActionID"]').click(async event => {
	const actionID = parseInt(event.target.id.substring(17));
	config.clipboard_action = actionID;
	await saveConfig();
});
// Handles clipboard action clicking.

async function toggleTheme() {
	if (config.light_theme) {
		config.light_theme = false;
	} else {
		config.light_theme = true;
	}
	await saveConfig();
	location.reload();
}
// Toggles the theme.

$(window).on("load", async() => {
	await $("body").show();
});
// Unhides the body when the page has loaded.

async function runCapture() {
	await remote.getGlobal("runCapture")();
}
// Runs the capture.

const successEmojiMap = {
	0: "Error",
	1: "Success",
};
// The map for capture success emojis.

function openScreenshot(url) {
	shell.openExternal(url);
}
// Opens a screenshot.

let db = remote.getGlobal("captureDatabase");
// Defines the DB.

async function deleteScreenshotDB(timestamp) {
	await db.run(
		"DELETE FROM captures WHERE timestamp = ?",
		[timestamp]
	);
	location.reload();
}
// Deletes a screenshot from the DB.

async function viewScreenshotFile(timestamp) {
	await shell.openItem(filePathMap[timestamp]);
}
// Opens up a screenshot.

async function addToCaptureTable(row) {
	const date_time = xssfilters.inHTMLData(new Date(row.timestamp).toLocaleString());
	const emoji = successEmojiMap[row.success];
	const filename = xssfilters.inHTMLData(row.filename);
	let parts = [
		`<td>${emoji}</td>`,
		`<td>${filename}</td>`,
		`<td>${date_time}</td>`,
	];
	if (row.url) {
		parts.push(`<td><a href="javascript:openScreenshot('${xssfilters.uriInHTMLData(row.url)}')">${xssfilters.uriInHTMLData(row.url)}</a></td>`);
	} else {
		parts.push("<td></td>");
	}
	if (row.file_path) {
		parts.push(`<td><a class="button is-primary" href="javascript:viewScreenshotFile(${row.timestamp})">View</a></td>`);
		filePathMap[row.timestamp] = row.file_path;
	} else {
		parts.push("<td></td>");
	}
	parts.push(`<td><a class="button is-danger" href="javascript:deleteScreenshotDB(${row.timestamp})">Remove</a></td>`);
	await $("#mainTableBody").append(`<tr id="ScreenshotTimestamped${row.timestamp}">${parts.join("")}</tr>`);
}
// Adds screenshots to the capture table.

db.each("SELECT * FROM (SELECT * FROM captures ORDER BY timestamp LIMIT 20) ORDER BY timestamp ASC", async(err, row) => {
	if (err) { console.log(err); }
	await addToCaptureTable(row);
});
// Goes through the last 20 captures.

if (config.light_theme) {
	$("#sidebar").css("background-color", "#e6e6e6");
} else {
	$("#sidebar").css("background-color", "#171819");
}
// Changes the colour scheme.
