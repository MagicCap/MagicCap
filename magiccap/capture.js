// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

const child_process = require("child_process");
const async_child_process = require("async-child-process");
const os = require("os");
const moment = require("moment");
const fsnextra = require("fs-nextra");
const fs = require("fs");
const { clipboard, nativeImage, ipcMain } = require("electron");
// Imports go here.

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
		const captureSuccessMap = {
			false: 0,
			true: 1,
		};
		const timestamp = new Date().getTime();
		await captureDatabase.run(
			"INSERT INTO captures VALUES (?, ?, ?, ?, ?)",
			[filename, captureSuccessMap[success], timestamp, url, file_path]
		);
		try {
			global.window.webContents.send("screenshot-upload", {
				filename: filename,
				success: captureSuccessMap[success],
				timestamp: timestamp,
				url: url,
				file_path: file_path,
			});
		} catch (err) {
			// This isn't too important, we should just ignore.
		}
	}
	// Logs uploads.

	static async createCapture(file_path) {
		let cap_location, clipboard_before, clipboard_after, result;
		let args = [];
		switch (process.platform) {
			case "linux":
			case "darwin": {
				if (process.platform === "darwin") {
					cap_location = "/usr/sbin/screencapture";
					args.push("-s");
				} else {
					cap_location = "maim";
					args.push("-iox");
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
				result = await fsnextra.readFile(file_path).catch(async() => {
					throw new Error("Could not read created screenshot. This can happen if you cancelled the screenshot.");
				});
				break;
			}
			case "win32": {
				try {
					await async_child_process.execAsync("snippingtool /clip");
					clipboard_after = clipboard.readImage();
				} catch (_) { break; }
				result = clipboard_after.toPNG();
				await fsnextra.writeFile(file_path, result).catch(async() => {
					throw new Error("Failed to write captured file.");
				});
				if (result.length == 0) {
					throw new Error("Screenshot cancelled.");
				}
				break;
			}
			default: {
				throw new Error(
					"Platform not supported for screen capture."
				);
			}
		}
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
			uploader_file = `${__dirname}/uploaders/${uploader_type}.js`;
			let lstatres = await fsnextra.lstat(uploader_file).catch(async() => {
				throw new Error("Uploader not found.");
			});
			if (!lstatres.isFile()) { throw new Error("Uploader not found."); }
			uploader = require(uploader_file);
			for (key in uploader.config_options) {
				if (!config[uploader.config_options[key].value]) {
					if (uploader.config_options[key].default) {
						config[uploader.config_options[key].value] = uploader.config_options[key].default;
					} else {
						throw new Error(
							"A required config option is missing."
						);
					}
				}
			}
			url = await uploader.upload(buffer, filename);
		}
		if (config.clipboard_action) {
			switch (config.clipboard_action) {
				case 1: {
					clipboard.writeImage(
						nativeImage.createFromBuffer(buffer)
					);
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
