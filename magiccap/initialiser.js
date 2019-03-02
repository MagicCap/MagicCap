// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Requirements for initialisation.
const { existsSync, renameSync, unlinkSync } = require("fs");
const { ensureDir } = require("fs-nextra");
const { darkThemeInformation } = require("./system_dark_theme");
const { sep } = require("path");
const { homedir } = require("os");
const { app } = require("electron");
const newInstallId = require("./install_id");
const { init } = require("@sentry/electron");

// Initialises the Sentry SDK.
init({
	dsn: "https://968dcfa0651e40ddaa807bbe47b1aa91@sentry.io/1396847",
});

// Moves the legacy MagicCap captures file to "magiccap.db" if it exists.
if (existsSync(`${homedir()}/magiccap_captures.db`)) {
	renameSync(`${homedir()}/magiccap_captures.db`, `${homedir()}/magiccap.db`);
}

// Imports the DB for further initialisation.
const db = require("better-sqlite3")(`${homedir()}/magiccap.db`);

// Makes sure that the captures table exists.
db.exec("CREATE TABLE IF NOT EXISTS `captures` (`filename` TEXT NOT NULL, `success` INTEGER NOT NULL, `timestamp` INTEGER NOT NULL, `url` TEXT, `file_path` TEXT);");

// Makes sure that the config table exists.
db.exec("CREATE TABLE IF NOT EXISTS `config` (`key` TEXT NOT NULL, `value` TEXT NOT NULL)");

// Creates the default config.
async function getDefaultConfig() {
	let pics_dir = app.getPath("pictures");
	pics_dir += `${sep}MagicCap${sep}`;
	let config = {
		hotkey: null,
		upload_capture: true,
		uploader_type: "magiccap",
		clipboard_action: 2,
		save_capture: true,
		save_path: pics_dir,
		light_theme: !await darkThemeInformation(),
		install_id: await newInstallId(),
	};
	await ensureDir(config.save_path).catch(async error => {
		if (!(error.errno === -4075 || error.errno === -17)) {
			config.Remove("save_path");
		}
	});
	return config;
}

// Handles the configuration (migration).
const { config, saveConfig } = require("./config");
if (Object.keys(config).length === 0) {
	if (existsSync(`${homedir()}/magiccap.json`)) {
		const oldConfig = require(`${homedir()}/magiccap.json`);
		unlinkSync(`${homedir()}/magiccap.json`);
		for (const i in oldConfig) {
			config[i] = oldConfig[i];
		}
		saveConfig();
	} else {
		getDefaultConfig().then(newConfig => {
			for (const i in newConfig) {
				config[i] = newConfig[i];
			}
			saveConfig();
		});
	}
} else if (!config.install_id) {
	newInstallId().then(installId => {
		config.install_id = installId;
		saveConfig();
	});
}

// Requires the app.
require(`${__dirname}/app.js`);
