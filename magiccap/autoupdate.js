// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.

const { stat, writeFile, writeJSON } = require("fs-nextra");
const { app, dialog } = require("electron");
const { get } = require("chainfetch");
const async_child_process = require("async-child-process");
const sudo = require("sudo-prompt");

// Checks if the autoupdate binaries are installed.
async function checkAutoupdateBin() {
	try {
		await stat("/usr/local/bin/magiccap-updater");
		return true;
	} catch (_) {
		return false;
	}
}

// Makes the JS code sleep.
const sleep = milliseconds => { return new Promise(resolve => setTimeout(resolve, milliseconds)); };

// Downloads the needed autoupdate binaries.
async function downloadBin() {
	const githubResp = await get(
		"https://api.github.com/repos/JakeMakesStuff/magiccap-updater/releases"
	).toJSON();
	const latest = githubResp.body[0];
	let osPart;
	switch (process.platform) {
		case "darwin":
			osPart = "mac";
			break;
		case "linux":
			osPart = "linux";
	}
	for (const asset of latest.assets) {
		if (asset.name == `magiccap-updater-${osPart}`) {
			const updaterBuffer = await get(asset.browser_download_url).toBuffer();
			await writeFile("/usr/local/bin/magiccap-updater", updaterBuffer.body);
			await async_child_process.execAsync("chmod 777 /usr/local/bin/magiccap-updater");
			break;
		}
	}
}

// Checks for any updates.
async function checkForUpdates() {
	let res;
	try {
		res = await get(`https://api.magiccap.me/version/check/${app.getVersion()}`).toJSON();
	} catch (_) {
		return {
			upToDate: true,
		}
	}
	if (res.status != 200) {
		return {
			upToDate: true,
		}
	};
	if (res.body.updated) {
		return {
			upToDate: true,
		}
	};
	return {
		upToDate: false,
		current: res.body.latest.version,
		changelogs: res.body.changelogs,
	}
}

// Does the update.
async function doUpdate(updateInfo) {
	await (new Promise(res => {
		sudo.exec(`/usr/local/bin/magiccap-updater v${updateInfo.current}`, {
			name: "MagicCap",
		}, error => {
			if (error) {
				console.log(error);
				throw error;
			}
			res();
		});
	}));
}

// Handles a new update.
async function handleUpdate(updateInfo, config, tempIgnore) {
	if (tempIgnore.indexOf(updateInfo.current) > -1) {
		return;
	}

	if (config.ignored_updates !== undefined) {
		if (config.ignored_updates.indexOf(updateInfo.current) > -1) {
			return;
		}
	}

	await dialog.showMessageBox({
		type: "warning",
		buttons: ["Update Now", "Not Now", "Skip Release"],
		title: "MagicCap",
		message: "A new version of MagicCap is available.",
		detail: `You are on v${app.getVersion()} and the latest is v${updateInfo.current}. Here are the changelogs since your current release:\n\n${updateInfo.changelogs}`,
	}, async response => {
		switch (response) {
			case 2:
				if (config.ignored_updates !== undefined) {
					config.ignored_updates.push(updateInfo.current);
				} else {
					config.ignored_updates = [updateInfo.current];
				}
				writeJSON(`${require("os").homedir()}/magiccap.json`, config).catch(async() => {
					console.log("Could not update the config.");
				});
				global.config = config;
				break;
			case 1:
				tempIgnore.push(updateInfo.current);
				break;
			case 0:
				await doUpdate(updateInfo);
		}
	});
}

// The actual autoupdate part.
module.exports = async function autoUpdateLoop(config) {
	if (config.autoupdate_on === false) {
		return;
	}
	const binExists = await checkAutoupdateBin();
	if (!binExists) {
		let toContinue = await new Promise(async res => {
			await dialog.showMessageBox({
				type: "warning",
				buttons: ["Yes", "No", "Don't ask again"],
				title: "MagicCap",
				message: "In order for autoupdate to work, MagicCap has to install some autoupdate binaries. Shall I do that? MagicCap will not autoupdate without this.",
			}, async response => {
				let toContinue = true;
				switch (response) {
					case 2:
						toContinue = false;
						config.autoupdate_on = false;
						writeJSON(`${require("os").homedir()}/magiccap.json`, config).catch(async() => {
							console.log("Could not update the config.");
						});
						global.config = config;
						break;
					case 1:
						toContinue = false;
						break;
					case 0:
						await downloadBin();
						break;
				}
				res(toContinue);
			});
		});
		if (!toContinue) {
			return;
		}
	}
	let tempIgnore = [];
	while (true) {
		const updateInfo = await checkForUpdates();
		if (!updateInfo.upToDate) {
			await handleUpdate(updateInfo, config, tempIgnore);
		}
		await sleep(600000);
	}
}
