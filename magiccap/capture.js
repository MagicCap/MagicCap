// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018-2019.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

const gifman = require("gifman")
const moment = require("moment")
const fsnextra = require("fs-nextra")
const { clipboard, nativeImage, Tray } = require("electron")
const i18n = require("./i18n")
const captureDatabase = require("better-sqlite3")(`${require("os").homedir()}/magiccap.db`)
const selector = require("magiccap-selector")
const sharp = require("electron-sharp")
// Imports go here.

let inGif = false
// Defines if we are in a GIF.

const captureStatement = captureDatabase.prepare("INSERT INTO captures VALUES (?, ?, ?, ?, ?)")
// Defines the capture statement.

module.exports = class CaptureHandler {
    static renderRandomChars(filename) {
        const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        if (filename.includes('"')) {
            let finalFilename = ""
            const filenameSplit = filename.split(/(")/)
            for (const part in filenameSplit) {
                if (filenameSplit[part] === '"') {
                    finalFilename += charset.charAt(Math.floor(Math.random() * charset.length))
                } else {
                    finalFilename += filenameSplit[part]
                }
            }
            return finalFilename
        }
        return filename
    }
    // Generates the random characters.

    static async createCaptureFilename(gif) {
        let filename = "screenshot_%date%_%time%"
        if (config.file_naming_pattern) {
            filename = config.file_naming_pattern
        }
        filename = this.renderRandomChars(filename
            .replace(/%date%/g, moment().format("DD-MM-YYYY"))
            .replace(/%time%/g, moment().format("HH-mm-ss")))
        return `${filename}.${gif ? "gif" : "png"}`
    }
    // Makes a nice filename for screen captures.

    static async logUpload(filename, success, url, file_path) {
        const timestamp = new Date().getTime()
        await captureStatement.run(filename, Number(success), timestamp, url, file_path)
        try {
            global.window.webContents.send("screenshot-upload", {
                filename: filename,
                success: Number(success),
                timestamp: timestamp,
                url: url,
                file_path: file_path,
            })
        } catch (err) {
            // This isn't too important, we should just ignore.
        }
    }
    // Logs uploads.

    static async createCapture(file_path, gif) {
        if (gif && inGif) {
            throw new Error("Screenshot cancelled.")
        }

        let selectorArgs
        if (!gif) {
            selectorArgs = [
                {
                    type: "selection",
                    name: "Blur",
                    imageLocation: `${__dirname}/icons/blur.png`,
                },
                {
                    type: "selection",
                    name: "__cap__",
                    imageLocation: `${__dirname}/icons/crosshair.png`,
                    active: true,
                },
            ]
        }

        const selection = await selector(selectorArgs)
        if (!selection) {
            throw new Error("Screenshot cancelled.")
        }

        if (gif) {
            inGif = true
            const displays = require("electron").screen.getAllDisplays().sort((a, b) => {
                let sub = a.bounds.x - b.bounds.x
                if (sub === 0) {
                    if (a.bounds.y > b.bounds.y) {
                        sub -= 1
                    } else {
                        sub += 1
                    }
                }
                return sub
            })
            const thisDisplay = displays[selection.display]
            await gifman.start(15, selection.start.pageX, selection.start.pageY, selection.width, selection.height, thisDisplay.id)
            const gifIcon = new Tray(`${__dirname}/icons/stop.png`)
            await new Promise(res => {
                gifIcon.once("click", () => {
                    res()
                })
            })
            gifIcon.setImage(`${__dirname}/icons/cog.png`)
            const buffer = await gifman.stop()
            await gifIcon.destroy()
            inGif = false
            if (file_path) {
                await fsnextra.writeFile(file_path, buffer)
            }
            return buffer
        } else {
            const displayFull = selection.screenshots[selection.display]
            const crops = []
            if (selection.selections.Blur) {
                for (const blurRegion of selection.selections.Blur) {
                    crops.push([
                        await sharp(displayFull)
                            .extract({
                                left: blurRegion.startPageX,
                                top: blurRegion.startPageY,
                                width: blurRegion.endPageX - blurRegion.startPageX,
                                height: blurRegion.endPageY - blurRegion.startPageY,
                            })
                            .blur(50)
                            .toBuffer(),
                        blurRegion.startPageX, blurRegion.startPageY,
                    ])
                }
            }

            let sharpDesktop = await sharp(displayFull)

            for (const blur of crops) {
                sharpDesktop = sharp(await sharpDesktop.overlayWith(blur[0], {
                    left: blur[1],
                    top: blur[2],
                }).toBuffer())
            }

            const cropped = sharpDesktop.extract({
                top: selection.start.pageY,
                left: selection.start.pageX,
                width: selection.width,
                height: selection.height,
            }).toBuffer()

            if (file_path) {
                await fsnextra.writeFile(file_path, cropped)
            }
            return cropped
        }
    }
    // Creates a screen capture.

    static async handleScreenshotting(filename, gif) {
        let save_path = null
        let uploader_type, url, uploader, key
        if (config.save_capture) {
            save_path = config.save_path + filename
        }
        let buffer = await this.createCapture(save_path, gif)
        if (config.upload_capture) {
            uploader_type = config.uploader_type
            const uploaderName = nameUploaderMap[uploader_type]
            if (uploaderName === undefined) {
                const notFoundi18n = await i18n.getPoPhrase("Uploader not found.", "capture")
                throw new Error(notFoundi18n)
            }
            uploader = importedUploaders[uploaderName]
            for (key in uploader.config_options) {
                if (config[uploader.config_options[key].value] === undefined) {
                    if (uploader.config_options[key].default) {
                        config[uploader.config_options[key].value] = uploader.config_options[key].default
                    } else {
                        const missingOptioni18n = await i18n.getPoPhrase("A required config option is missing.", "capture")
                        throw new Error(missingOptioni18n)
                    }
                }
            }
            url = await uploader.upload(buffer, gif ? "gif" : "png", filename)
        }
        if (config.clipboard_action) {
            switch (config.clipboard_action) {
                case 1: {
                    clipboard.writeImage(
                        nativeImage.createFromBuffer(buffer)
                    )
                    break
                }
                case 2: {
                    if (!url) {
                        const noURLi18n = await i18n.getPoPhrase("URL not found to put into the clipboard. Do you have uploading on?", "capture")
                        throw new Error(noURLi18n)
                    }
                    clipboard.writeText(url)
                    break
                }
                default: {
                    throw new Error(
                        "Unknown clipboard action."
                    )
                }
            }
        }
        await this.logUpload(filename, true, url, save_path)
        const i18nResult = await i18n.getPoPhrase("Image successfully captured.", "capture")
        return i18nResult
    }
    // Handle screenshots.
}
