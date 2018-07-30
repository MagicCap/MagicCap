// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

const child_process = require("child_process");
const async_child_process = require("async-child-process");
const os = require("os");
const moment = require("moment");
const fsnextra = require("fs-nextra");
const fs = require("fs");
const { clipboard } = require("electron");

let captures = global.captures;

module.exports = class CaptureHandler {
	static async createCaptureFilename() {
		let filename = "screenshot_%date%_%time%";
		if (config.file_naming_pattern) {
			filename = config.file_naming_pattern;
		}
		filename = filename
			.replace("%date%", moment().format("DD-MM-YYYY"))
			.replace("%time%", moment().format("HH-mm-ss"));
		return `${filename}.png`;
	}
	// Makes a nice filename for screen captures.

	static async logUpload(filename, success, url, file_path) {
		captures.captures.push({
			filename: filename,
			success: success,
			url: url,
			file_path: file_path,
		});
		fsnextra.writeJSON(`${require("os").homedir()}/magiccap_captures.json`, captures).catch(async() => {
			throw new Error("Could not update the capture logging file.");
		});
	}
	// Logs uploads.

	static async createCapture(file_path) {
		let cap_location;
		let args = [];
		switch (process.platform) {
			case "darwin": {
				cap_location = "/usr/sbin/screencapture";
				args.push("-iox");
				break;
			}
			case "linux": {
				cap_location = "maim";
				args.push("-s");
				break;
			}
			case "win32": {
				cap_location = "powershell";
				args.push("./capture-win.ps1");
				break;
			}
			default: {
				throw new Error(
					"Platform not supported for screen capture."
				);
			}
		}
		args.push(file_path);
		let capture = child_process.spawn(cap_location, args);
		try {
			await async_child_process.join(capture);
		} catch (_) {
			throw new Error(
				"The screenshot capturing/saving failed."
			);
		}
		let result = await fsnextra.readFile(file_path).catch(async() => {
			throw new Error("Could not read created screenshot. This can happen if you cancelled the screenshot.");
		});
		if (result) return result;
	}
	// Creates a screen capture.

	static async handleScreenshotting(filename) {
		let delete_after = true;
		let save_path, uploader_type, uploader_file, url, uploader, key;
		if (config.save_capture) {
			save_path = config.save_path + filename;
			delete_after = false;
		} else {
			save_path = `${os.tmpdir()}/${filename}`;
		}
		let buffer = await this.createCapture(save_path);
		if (config.upload_capture) {
			uploader_type = config.uploader_type;
			uploader_file = `./uploaders/${uploader_type}.js`;
			let lstatres = await fsnextra.lstat(uploader_file).catch(async() => {
				throw new Error("Uploader not found.");
			});
			if (!lstatres.isFile()) { throw new Error("Uploader not found."); }
			uploader = require(uploader_file);
			for (key in uploader.config_options) {
				if (!config[uploader.config_options[key]]) {
					throw new Error(
						"A required config option is missing."
					);
				}
			}
			url = await uploader.upload(buffer);
		}
		if (config.clipboard_action) {
			switch (config.clipboard_action) {
				case 0: { break; }
				case 1: {
					clipboard.writeBuffer(buffer);
					break;
				}
				case 2: {
					if (!url) {
						throw new Error(
							"URL not found to put into the clipboard. Do you have uploading on?"
						);
					}
					clipboard.writeText(url);
					break;
				}
				default: {
					throw new Error(
						"Unknown clipboard action."
					);
				}
			}
		}
		if (delete_after) {
			await fsnextra.unlink(save_path).catch(async() => { throw new Error("Could not delete capture."); });
			save_path = null;
		}
		await this.logUpload(filename, true, url, save_path);
		return "Image successfully captured.";
	}
	// Handle screenshots.
};
