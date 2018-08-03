// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

const { shell, remote, ipcRenderer } = require("electron");
const $ = require("jquery");
const fsnextra = require("fs-nextra");
const xssfilters = require("xss-filters");
let config = global.config;
let filePathMap = {};
// Imports go here.

async function saveConfig() {
	fsnextra.writeJSON(`${require("os").homedir()}/magiccap.json`, config).catch(async() => {
		console.log("Could not update the config.");
	});
	ipcRenderer.send("config-edit", config);
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

async function loadCaptureTable() {
	await db.each("SELECT * FROM (SELECT * FROM captures ORDER BY timestamp LIMIT 20) ORDER BY timestamp ASC", async(err, row) => {
		if (err) { console.log(err); }
		await addToCaptureTable(row, "#mainTableBody");
	});
}
loadCaptureTable();
// Goes through the last 20 captures.

async function deleteScreenshotDB(timestamp) {
	await db.run(
		"DELETE FROM captures WHERE timestamp = ?",
		[timestamp]
	);
	await $("#mainTableBody").empty();
	await loadCaptureTable();
}
// Deletes a screenshot from the DB.

async function viewScreenshotFile(timestamp) {
	await shell.openItem(filePathMap[timestamp]);
}
// Opens up a screenshot.

async function addToCaptureTable(row, elementName) {
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
	await $(elementName).append(`<tr id="ScreenshotTimestamped${row.timestamp}">${parts.join("")}</tr>`);
}
// Adds screenshots to the capture table.

if (config.light_theme) {
	$("#sidebar").css("background-color", "#e6e6e6");
} else {
	$("#sidebar").css("background-color", "#171819");
}
// Changes the colour scheme.

ipcRenderer.on("screenshot-upload", async(event, data) => {
	await addToCaptureTable(data, "#mainTableBody");
	const tableChildren = await $("#mainTableBody").children();
	if (tableChildren.length === 21) {
		await tableChildren[0].remove();
	}
});
// Handles new screenshots.

let importedUploaders = {};
// A list of imported uploaders.

(async() => {
	const files = await fsnextra.readdir("./uploaders");
	for (const file in files) {
		const import_ = require(`../uploaders/${files[file]}`);
		importedUploaders[import_.name] = import_;
	}
	for (const uploader in importedUploaders) {
		await $("#uploaderConfigBody").append(`<a class="button" href="javascript:renderUploader('${uploader}')"><span class="icon is-medium"><img class="rounded-img" src="../icons/${importedUploaders[uploader].icon}"></span><p>${uploader}</p></a><div class="divider"/>`);
	}
})();
// Renders the uploader config buttons.

function showUploaderConfig() {
	$("#uploaderConfig").addClass("is-active");
}
// Shows the uploader config page.

$("#uploaderConfigClose").click(async() => {
	await $("#uploaderConfig").removeClass("is-active");
});
// Handles the uploader config close button.

if (config.upload_capture) {
	$("#uploaderConfigCheckbox").prop("checked", true);
}
// Toggles the uploader config checkbox.

$("#uploaderConfigCheckbox").click(async() => {
	if (config.upload_capture) {
		config.upload_capture = false;
	} else {
		config.upload_capture = true;
	}
	await saveConfig();
});
// Change the uploader capture toggling.

function getDefaultValue(option, uploader) {
	if (config[option.value]) { return config[option.value]; }
	if (option.default) { return option.default; }
	return "";
}
// Gets the default value.

async function renderUploader(uploaderName) {
	let parts = [
		'<article class="message is-danger is-hidden" id="requiredStuffMissing"><div class="message-body">Required arguments are missing.</div></article>',
		'<article class="message is-danger is-hidden" id="notAIntYouGiddyGoat"><div class="message-body">You provided a invalid integer.</div></article>',
		'<article class="message is-success is-hidden" id="ayyyyDefaultSaved"><div class="message-body">Default uploader successfully saved.</div></article>',
	];
	const uploader = importedUploaders[uploaderName];
	for (const configOptionName in uploader.config_options) {
		const optionData = uploader.config_options[configOptionName];
		switch (optionData.type.toLowerCase()) {
			case "text":
			case "integer": {
				parts.push(`<div class="field"><label class="label">${xssfilters.inHTMLData(configOptionName)}:</label><div class="control"><input class="input" type="text" id="${optionData.value}" placeholder="${xssfilters.inHTMLData(configOptionName)}" value="${getDefaultValue(optionData, uploader)}"></div></div>`);
				break;
			}
			case "password": {
				parts.push(`<div class="field"><label class="label">${xssfilters.inHTMLData(configOptionName)}:</label><div class="control"><input class="input" type="password" id="${optionData.value}" placeholder="${xssfilters.inHTMLData(configOptionName)}" value="${getDefaultValue(optionData, uploader)}"></div></div>`);
				break;
			}
			case "boolean": {
				const type = getDefaultValue(optionData, uploader);
				let extra = "";
				if (type === true) {
					extra = " checked";
				}
				parts.push(`<div class="field"><label class="label">${xssfilters.inHTMLData(configOptionName)}:</label><label class="checkbox"><input type="checkbox" id="${optionData.value}"${extra}> ${xssfilters.inHTMLData(configOptionName)}</label></label></div>`);
				break;
			}
		}
	}
	if (parts.length === 3) {
		parts.push("<p>There are no configuration options for this uploader.</p><br>");
	}
	parts.push(`<a class="button is-success" href="javascript:setDefaultUploader('${xssfilters.inHTMLData(uploader.name)}')">Set As Default Uploader</a>`);
	await $("body").append(`<div class="modal is-active" id="activeUploaderConfig"><div class="modal-background"></div><div class="modal-card"><header class="modal-card-head"><p class="modal-card-title">${xssfilters.inHTMLData(uploader.name)}</p><button class="delete" aria-label="close" id="activeUploaderConfigClose"></button></header><section class="modal-card-body" id="activeUploaderConfigBody">${parts.join("")}</section></div></div>`);
	$("#activeUploaderConfigClose").click(async() => {
		await $("#activeUploaderConfig").remove();
	});
	for (const configOptionName in uploader.config_options) {
		const optionData = uploader.config_options[configOptionName];
		switch (optionData.type.toLowerCase()) {
			case "boolean": {
				$(`#${optionData.value}`).click(async() => {
					if (config[optionData.value]) {
						config[optionData.value] = false;
					} else {
						config[optionData.value] = true;
					}
					await saveConfig();
				});
				break;
			}
			default: {
				$(`#${optionData.value}`).on("input", async() => {
					config[optionData.value] = await $(`#${optionData.value}`).val();
					await saveConfig();
				});
			}
		}
	}
	await $("#uploaderConfig").removeClass("is-active");
}
// Renders the uploader.

async function displayUploaderMessage(toDisplay) {
	const msgs = [
		"#notAIntYouGiddyGoat",
		"#requiredStuffMissing",
		"#ayyyyDefaultSaved",
	];
	for (const msg in msgs) {
		if (msgs[msg] === toDisplay) { continue; }
		const jq = await $(msgs[msg]);
		if (await jq.hasClass("is-hidden")) { continue; }
		await jq.addClass("is-hidden");
	}
	if (await $(toDisplay).hasClass("is-hidden")) { await $(toDisplay).removeClass("is-hidden"); }
}
// Displays the appropriate uploader message.

async function setDefaultUploader(uploaderName) {
	const uploader = importedUploaders[uploaderName];
	let configRemap = {};
	for (const configKey in uploader.config_options) {
		const option = uploader.config_options[configKey];
		configRemap[option.value] = option;
	}
	for (const value in configRemap) {
		const jqueryObject = await $(`#${value}`);
		const objValue = await jqueryObject.val();
		switch (configRemap[value].type) {
			case "text":
			case "password": {
				if (objValue === "" && configRemap[value].required) {
					await displayUploaderMessage("#requiredStuffMissing");
					return;
				}
				break;
			}
			case "integer": {
				if (objValue === "" && configRemap[value].required) {
					await displayUploaderMessage("#requiredStuffMissing");
					return;
				}
				if (isNaN(objValue)) {
					await displayUploaderMessage("#notAIntYouGiddyGoat");
					return;
				}
				break;
			}
		}
	}
	let filename;
	const files = await fsnextra.readdir("./uploaders");
	for (const file in files) {
		const import_ = require(`../uploaders/${files[file]}`);
		if (import_.name === uploaderName) {
			filename = files[file].substring(0, files[file].length - 3);
			break;
		}
	}
	config.uploader_type = filename;
	await saveConfig();
	await displayUploaderMessage("#ayyyyDefaultSaved");
}
// Sets the default uploader.

function showFileConfig() {
	$("#fileConfig").addClass("is-active");
}
// Shows the file config.

if (config.file_naming_pattern) {
	$("#fileNamingPattern").val(config.file_naming_pattern);
} else {
	$("#fileNamingPattern").val("screenshot_%date%_%time%");
}
// Fills in the file naming pattern.

$("#fileNamingPattern").on("input", async() => {
	config.file_naming_pattern = await $("#fileNamingPattern").val();
	await saveConfig();
});
// Saves the file naming pattern.

if (config.save_capture) {
	$("#fileConfigCheckbox").prop("checked", true);
}
// Handles ticking the file config checkbox.

$("#fileConfigCheckbox").click(async() => {
	if (config.save_capture) {
		config.save_capture = false;
	} else {
		config.save_capture = true;
	}
	await saveConfig();
});
// Handles saving the file config checkbox.

$("#fileConfigClose").click(async() => {
	await $("#fileConfig").removeClass("is-active");
});
// Closes the file config.

if (config.save_path) {
	$("#fileSaveFolder").val(config.save_path);
}
// Sets the folder save path.

$("#fileSaveFolder").on("input", async() => {
	let savePath = await $("#fileSaveFolder").val();
	let slashType;
	switch (process.platform) {
		case "darwin":
		case "linux": {
			slashType = "/";
			break;
		}
		case "win32": {
			slashType = "\\";
		}
	}
	if (!savePath.endsWith(slashType)) {
		savePath += slashType;
	}
	config.save_path = savePath;
	await saveConfig();
});
// Saves the file naming pattern.

function showHotkeyConfig() {
	$("#hotkeyConfig").addClass("is-active");
}
// Shows the hotkey config.

if (config.hotkey) {
	$("#screenshotHotkey").val(config.hotkey);
}
// Sets the value of the hotkey textbox.

$("#hotkeyConfigClose").click(async() => {
	const text = await $("#screenshotHotkey").val();
	if (config.hotkey !== text) {
		if (text === "") {
			ipcRenderer.send("hotkey-unregister");
			config.hotkey = null;
			await saveConfig();
		} else {
			ipcRenderer.send("hotkey-unregister");
			config.hotkey = text;
			await saveConfig();
			ipcRenderer.send("hotkey-change", text);
		}
	}
	await $("#hotkeyConfig").removeClass("is-active");
});
// Allows you to close the hotkey config.

function openAcceleratorDocs() {
	shell.openExternal("https://electronjs.org/docs/api/accelerator");
}
// Opens the Electron accelerator documentation.
