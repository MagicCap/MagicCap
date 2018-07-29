// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

const child_process = require("child_process");
const os = require("os");
const processWindows = require("node-process-windows");
const moment = require("moment");
const fsnextra = require("fs-nextra");
const { clipboard } = require("electron");

exports = class CaptureHandler {
    async logUpload(file_name, success, url, file_path) {
        let sql_question_marks = "?, ?, ?";
        let args = [success, Date.getTime(), file_name];
        if(url) {
            sql_question_marks += ", ?";
            args.push(url);
        }
        if(file_path) {
            sql_question_marks += ", ?";
            args.push(file_path);
        }
        db.serialize(function() {
            db.run("INSERT INTO captures VALUES (" + sql_question_marks + ")", args);
        })
    }

    async createCapture(file_path) {
        let args = [];
        switch(process.platform) {
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
        capture.stderr.on("close", async(code) => {
            if (code != 0) {
                // Oh no! That's not good.
                throw new Error(
                    "The screenshot capturing/saving failed."
                );
            }
            let result = await fsnextra.readFile(location).catch(async() => new Error("Could not read created screenshot."));
            if (result) return result;
        });

    }
    // Creates a screen capture.

    createCaptureFilename() {
        let filename = "%focused_proc%_%date%_%time%";
        if(config.file_naming_pattern) {
            filename = config.file_naming_pattern;
        }
        let active_window = processWindows.getActiveWindow();
        filename
            .replace("%focused_proc%", active_window.processName)
            .replace("%date%", moment().format("DD-MM-YYYY"))
            .replace("%time%", moment().format("HH-mm-ss"))
        return filename + ".png";
    }
    // Makes a nice filename for screen captures.

    async handleScreenshotting(filename) {
        let delete_after = true;
        let save_path, uploader_type, uploader_file, url, uploader;
        if(config.save_capture) {
            save_path = config.save_path + filename;
        } else {
            save_path = `${os.tmpdir()}/${filename}`;
            delete_after = false;
        }
        let buffer = createCapture(save_path);
        if (config.upload_capture) {
            uploader_type = config.uploader_type;
            uploader_file = `./uploaders/${uploader_type}.js`
            if(!fs.lstatSync(uploader_file).isFile()){
                throw new Error(
                    "Uploader not found."
                );
            }
            uploader = require(uploader_file);
            for(key in uploader.config_options) {
                if(!(config[uploader.config_options[key]])) {
                    throw new Error(
                        "A required config option is missing."
                    );
                }
            }
            url = await uploader.upload(buffer);
        }
        if(config.clipboard_action) {
            switch(config.clipboard_action) {
                case 0: { break; }
                case 1: {
                    clipboard.writeBuffer(buffer);
                    break;
                }
                case 2: {
                    if(!url) {
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
            await fsnextra.unlink(uploader_file + ".js").catch(async() => new Error("Could not delete capture."));
        }
        return "Image successfully captured.";
    }
    // Handle screenshots.
}
