// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018-2019.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

// The needed imports.
const { ipcRenderer, remote, shell } = require("electron");
const { writeJSON, readdir } = require("fs-nextra");
const config = require(`${require("os").homedir()}/magiccap.json`);

// Sets the MagicCap version.
document.getElementById("magiccap-ver").innerText = `MagicCap v${remote.app.getVersion()}`;

// Changes the colour scheme.
const stylesheet = document.createElement("link");
stylesheet.setAttribute("rel", "stylesheet");
if (config.light_theme) {
	stylesheet.setAttribute("href", "../node_modules/bulmaswatch/default/bulmaswatch.min.css");
	document.getElementById("sidebar").style.backgroundColor = "#e6e6e6";
} else {
	stylesheet.setAttribute("href", "../node_modules/bulmaswatch/darkly/bulmaswatch.min.css");
	document.getElementById("sidebar").style.backgroundColor = "#171819";
}
document.getElementsByTagName("head")[0].appendChild(stylesheet);

// Defines the DB.
const db = remote.getGlobal("captureDatabase");

// A list of the displayed captures.
const displayedCaptures = [];

// Handles each capture.
async function getCaptures() {
	displayedCaptures.length = 0;
	await db.each("SELECT * FROM captures ORDER BY timestamp DESC LIMIT 20", (err, row) => {
		if (err) { console.log(err); }
		displayedCaptures.push(row);
	});
}
getCaptures();

// Handles the upload list.
new Vue({
	el: "#mainTableBody",
	data: {
		captures: displayedCaptures,
		successMap: {
			0: "Failure",
			1: "Success",
		},
	},
	methods: {
		rmCapture: async timestamp => {
			await db.run(
				"DELETE FROM captures WHERE timestamp = ?",
				[timestamp],
			);
			await getCaptures();
		},
		openScreenshotURL: async url => {
			await shell.openExternal(url);
		},
		openScreenshotFile: async filePath => {
			await shell.openItem(filePath);
		},
	},
});

// Defines the clipboard action.
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

// Handles the clipboard actions.
new Vue({
	el: "#clipboardAction",
	data: {
		action: clipboardAction,
	},
	methods: {
		changeAction: async action => {
			config.clipboard_action = action;
			await saveConfig();
		},
	},
});

// Handles the clipboard action close button.
function closeClipboardConfig() {
	document.getElementById("clipboardAction").classList.remove("is-active");
}

// Shows the clipboard action settings page.
function showClipboardAction() {
	document.getElementById("clipboardAction").classList.add("is-active");
}

// Handles new screenshots.
ipcRenderer.on("screenshot-upload", async() => {
	await getCaptures();
});

// Runs the fullscreen capture.
async function runCapture() {
	await remote.getGlobal("runCapture")();
}

// Runs the window capture.
async function runWindowCapture() {
	await remote.getGlobal("runCapture")(true);
}

// Unhides the body/window when the page has loaded.
window.onload = () => {
	document.body.style.display = "initial";
	ipcRenderer.send("window-show");
};

// Shows the about page.
function showAbout() {
	document.getElementById("about").classList.add("is-active");
}

// Handles the about close button.
function closeAbout() {
	document.getElementById("about").classList.remove("is-active");
}

// Opens the MPL 2.0 license in a browser.
function openMPL() {
	shell.openExternal("https://www.mozilla.org/en-US/MPL/2.0");
}

// Saves the config.
async function saveConfig() {
	try {
		await writeJSON(`${require("os").homedir()}/magiccap.json`, config);
	} catch (err) {
		console.log(err);
	}
	ipcRenderer.send("config-edit", config);
}

// Toggles the theme.
async function toggleTheme() {
	config.light_theme = !config.light_theme;
	await saveConfig();
	location.reload();
}

// Shows the hotkey config.
function showHotkeyConfig() {
	document.getElementById("hotkeyConfig").classList.add("is-active");
}

// Allows you to close the hotkey config.
async function hotkeyConfigClose() {
	const text = document.getElementById("screenshotHotkey").value;
	const windowText = document.getElementById("windowScreenshotHotkey").value;
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
		if (config.window_hotkey) {
			ipcRenderer.send("window-hotkey-change", config.window_hotkey);
		}
	}
	if (config.window_hotkey !== windowText) {
		if (windowText === "") {
			ipcRenderer.send("hotkey-unregister");
			config.window_hotkey = null;
			await saveConfig();
		} else {
			ipcRenderer.send("hotkey-unregister");
			config.window_hotkey = windowText;
			await saveConfig();
			ipcRenderer.send("window-hotkey-change", windowText);
		}
		if (config.hotkey) {
			ipcRenderer.send("hotkey-change", config.hotkey);
		}
	}
	document.getElementById("hotkeyConfig").classList.remove("is-active");
}

// Opens the Electron accelerator documentation.
function openAcceleratorDocs() {
	shell.openExternal("https://electronjs.org/docs/api/accelerator");
}

// Handles rendering the hotkey config body.
new Vue({
	el: "#hotkeyConfigBody",
	data: {
		screenshotHotkey: config.hotkey || "",
		windowHotkey: config.window_hotkey || "",
	},
});

// Repoints path for later.
const sep = require("path").sep;

// Handles the file config.
new Vue({
	el: "#fileConfig",
	data: {
		fileConfigCheckboxI: config.save_capture || false,
		fileNamingPatternI: config.file_naming_pattern || "screenshot_%date%_%time%",
		fileSaveFolderI: config.save_path,
	},
	methods: {
		saveItem: (key, configKey, not, path) => {
			if (path) {
				if (!this[key].endsWith(sep)) {
					this[key] += sep;
				}
			}
			if (not) {
				this[key] = !this[key];
			}
			config[configKey] = this[key];
			saveConfig();
		},
	},
});

// Toggles the file config.
const toggleFileConfig = (toggle = false) => document.getElementById("fileConfig").classList[toggle ? "add" : "remove"]("is-active");

// Defines the active uploader config.
const activeUploaderConfig = new Vue({
	el: "#activeUploaderConfig",
	data: {
		uploader: {
			name: "",
			options: {},
		},
		exception: "",
	},
	methods: {
		getDefaultValue: option => {
			switch (option.type) {
				case "boolean": {
					const c = config[option.value];
					if (c === undefined) {
						if (option.default !== undefined) {
							return option.default;
						}
						return false;
					}
					return c;
				}
				default: {
					if (config[option.value]) {
						return config[option.value];
					}
					if (option.default !== undefined) {
						return option.default;
					}
					return "";
				}
			}
		},
		changeOption: option => {
			let res = document.getElementById(option.value).value;
			if (res === "") {
				res = undefined;
			}
			switch (option.type) {
				case "integer":
					res = parseInt(res) || option.default || undefined;
					break;
				case "boolean":
					res = document.getElementById(option.value).checked;
					break;
			}
			config[option.value] = res;
			saveConfig();
		},
		deleteRow: (key, option) => {
			delete option.items[key];
			config[option.value] = option.items;
			this.$forceUpdate();
			saveConfig();
		},
		addToTable: option => {
			this.$set(this, "exception", "");
			const key = document.getElementById(`Key${option.value}`).value || "";
			const value = document.getElementById(`Value${option.value}`).value || "";
			if (key === "") {
				this.exception += "blankKey";
				return;
			}
			if (option.items[key] !== undefined) {
				this.exception += "keyAlreadyUsed";
				return;
			}
			option.items[key] = value;
			config[option.value] = option.items;
			this.$forceUpdate();
			saveConfig();
		},
		closeActiveConfig() {
			this.$set(this, "exception", "");
			document.getElementById("activeUploaderConfig").classList.remove("is-active");
		},
		setDefaultUploader() {
			this.$set(this, "exception", "");
			for (const optionKey in this.uploader.options) {
				const option = this.uploader.options[optionKey];
				const c = config[option.value];
				if (c === undefined && option.required) {
					if (option.default) {
						config[option.value] = option.default;
						saveConfig();
					} else if (option.type === "integer" && !parseInt(document.getElementById(option.value).value)) {
						this.exception += "notAIntYouGiddyGoat";
						return;
					} else {
						this.exception += "requiredStuffMissing";
						return;
					}
				}
			}

			let view = this;
			readdir(`${__dirname}/../uploaders`).then(files => {
				let filename = "";
				for (const file in files) {
					const import_ = require(`${__dirname}/../uploaders/${files[file]}`);
					if (import_.name === view.uploader.name) {
						filename = files[file].substring(0, files[file].length - 3);
						break;
					}
				}
				config.uploader_type = filename;
				saveConfig();
				view.exception += "ayyyyDefaultSaved";
			});
		},
	},
});

// Shows the uploader config page.
function showUploaderConfig() {
	document.getElementById("uploaderConfig").classList.add("is-active");
}

// All of the imported uploaders.
importedUploaders = ipcRenderer.sendSync("get-uploaders");

// Renders all of the uploaders.
new Vue({
	el: "#uploaderConfigBody",
	data: {
		uploaders: importedUploaders,
		checkUploadCheckbox: config.upload_capture,
	},
	methods: {
		renderUploader: (uploader, uploaderKey) => {
			const options = {};
			for (const optionKey in uploader.config_options) {
				const option = uploader.config_options[optionKey];
				switch (option.type) {
					case "text":
					case "integer":
					case "password":
					case "boolean": {
						options[optionKey] = {
							type: option.type,
							value: option.value,
							default: option.default,
							required: option.required,
						};
						if (option.type === "boolean") {
							config[option.value] = config[option.value] || false;
							saveConfig();
						}
						break;
					}
					case "object": {
						const i = config[option.value] || option.default || {};
						options[optionKey] = {
							type: option.type,
							value: option.value,
							default: option.default,
							required: option.required,
							items: i,
						};
						config[option.value] = i;
						saveConfig();
						break;
					}
				}
			}
			activeUploaderConfig.$set(activeUploaderConfig.uploader, "name", uploaderKey);
			activeUploaderConfig.$set(activeUploaderConfig.uploader, "options", options);
			document.getElementById("uploaderConfig").classList.remove("is-active");
			document.getElementById("activeUploaderConfig").classList.add("is-active");
		},
		toggleCheckbox() {
			this.$set(this, "checkUploadCheckbox", !this.checkUploadCheckbox);
			config.upload_capture = this.checkUploadCheckbox;
			saveConfig();
		},
	},
});

// Hides the uploader config page.
function hideUploaderConfig() {
	document.getElementById("uploaderConfig").classList.remove("is-active");
}
