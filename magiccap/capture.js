// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018-2019.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.
// Copyright (C) Matt Cowley (MattIPv4) <me@mattcowley.co.uk> 2019.

// Imports go here.
const magicImports = require("magicimports")
const gifman = require("gifman")
const moment = magicImports("moment")
const fsnextra = magicImports("fs-nextra")
const { clipboard, nativeImage, Tray, dialog } = magicImports("electron")
const i18n = require("./i18n")
const captureDatabase = magicImports("better-sqlite3")(`${require("os").homedir()}/magiccap.db`)
const selector = require("./selector")
const sharp = magicImports("sharp")
const notifier = magicImports("node-notifier")
// Source: https://raw.githubusercontent.com/missive/emoji-mart/master/data/apple.json
const appleEmojis = require("./emojis/apple.json").emojis

// Defines if we are in a GIF.
let inGif = false

// Defines the capture statement.
const captureStatement = captureDatabase.prepare("INSERT INTO captures VALUES (?, ?, ?, ?, ?)")

module.exports = class CaptureHandler {
    // Replaces pattern with callback
    static replacePatternCallback(string, pattern, called) {
        if (string.includes(pattern)) {
            let finalString = ""
            const stringSplit = string.split(new RegExp(`(${pattern})`))
            for (const part in stringSplit) {
                if (stringSplit[part] === pattern) {
                    finalString += called()
                } else {
                    finalString += stringSplit[part]
                }
            }
            return finalString
        }
        return string
    }

    // Generates a random character
    static getRandomString() {
        const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        return charset.charAt(Math.floor(Math.random() * charset.length))
    }

    // Generates any random emoji
    static getRandomEmoji() {
        // Choose a random
        const emojiArray = Object.values(appleEmojis)
        let emoji = emojiArray[Math.floor(Math.random() * emojiArray.length)]

        // Convert from code point to emoji string
        emoji = String.fromCodePoint(parseInt(emoji.b, 16))
        return emoji
    }

    // Makes a nice filename for screen captures.
    static async createCaptureFilename(gif) {
        // Get pattern
        let filename = "screenshot_%date%_%time%"
        if (config.file_naming_pattern) {
            filename = config.file_naming_pattern
        }

        // Sub in fixed patterns
        filename = filename.replace(/%date%/g, moment().format("DD-MM-YYYY"))
        filename = filename.replace(/%time%/g, moment().format("HH-mm-ss"))

        // Sub in dynamic patterns
        filename = this.replacePatternCallback(filename, '"', this.getRandomString)
        filename = this.replacePatternCallback(filename, "%emoji%", this.getRandomEmoji)

        // Return with correct prefix
        return `${filename}.${gif ? "gif" : "png"}`
    }

    // Logs uploads.
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

    // Throws a notification.
    static throwNotification(result) {
        notifier.notify({
            title: "MagicCap",
            message: result,
            icon: `${__dirname}/icons/taskbar@2x.png`,
        })
    }

    // Handles from a buffer and filename.
    static async fromBufferAndFilename(uploader, buffer, filename, fp) {
        const extension = filename.split(".").pop().toLowerCase()
        let url
        try {
            url = await uploader.upload(buffer, extension, filename)
        } catch (err) {
            if (err.message !== "Screenshot cancelled.") {
                await this.logUpload(filename, false, null, null)
                dialog.showErrorBox("MagicCap", `${err.message}`)
            }
            return
        }
        const successi18n = await i18n.getPoPhrase("The file specified was uploaded successfully.", "app")
        this.throwNotification(successi18n)
        if (!fp && config.save_capture) {
            // We need to save this and tailor the return.
            fp = `${config.save_path}${filename}`
            await fsnextra.writeFile(fp, buffer)
            switch (config.clipboard_action) {
                case 1: {
                    clipboard.writeImage(
                        nativeImage.createFromBuffer(buffer)
                    )
                    break
                }
                case 2: {
                    clipboard.writeText(url)
                    break
                }
                default: {
                    throw new Error(
                        "Unknown clipboard action."
                    )
                }
            }
        } else {
            clipboard.writeText(url)
        }
        await this.logUpload(filename, true, url, fp)
    }

    // Creates a screen capture.
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
                    imageLocation: "blur.png",
                },
                {
                    type: "selection",
                    name: "__cap__",
                    imageLocation: "crosshair.png",
                    active: true,
                },
            ]
        }

        const selection = await selector(selectorArgs)
        if (!selection) {
            throw new Error("Screenshot cancelled.")
        }

        const electronScreen = magicImports("electron").screen

        const displays = electronScreen.getAllDisplays().sort((a, b) => {
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

        if (gif) {
            inGif = true
            await gifman.start(
                15, selection.start.pageX, selection.start.pageY,
                selection.width, selection.height, thisDisplay
            )
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
                    if (electronScreen.getDisplayNearestPoint({
                        x: blurRegion.startX,
                        y: blurRegion.startY,
                    }).id !== thisDisplay.id) {
                        continue
                    }

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

            let sharpDesktop = sharp(displayFull)

            for (const blur of crops) {
                sharpDesktop = sharp(await sharpDesktop.overlayWith(blur[0], {
                    left: blur[1],
                    top: blur[2],
                }).toBuffer())
            }

            const cropped = await sharpDesktop.extract({
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

    // Gets the default uploader.
    static async getDefaultUploader() {
        const uploader_type = config.uploader_type
        const uploaderName = nameUploaderMap[uploader_type]
        if (uploaderName === undefined) {
            const notFoundi18n = await i18n.getPoPhrase("Uploader not found.", "capture")
            throw new Error(notFoundi18n)
        }
        return importedUploaders[uploaderName]
    }

    // Handle screenshots.
    static async handleScreenshotting(filename, gif) {
        let save_path = null
        let url, uploader, key
        if (config.save_capture) {
            save_path = config.save_path + filename
        }
        let buffer = await this.createCapture(save_path, gif)
        if (config.upload_capture) {
            uploader = await this.getDefaultUploader()
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
            try {
                url = await uploader.upload(buffer, gif ? "gif" : "png", filename)
            } catch (_) {
                // Lets try with a new filename.
                filename = `${await this.createCaptureFilename(gif)}.${gif ? "gif" : "png"}`
                url = await uploader.upload(buffer, gif ? "gif" : "png", filename)
            }
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

    // Handle from clipboard
    static async handleClipboard(filename) {
        // Attempt to fetch the nativeimage from the clipboard
        let image = clipboard.readImage()
        // If clipboard cannot be made an image, abort
        if (image.isEmpty()) {
            const noImagei18n = await i18n.getPoPhrase("The clipboard does not contain an image", "capture")
            throw new Error(noImagei18n)
        }
        // Convert nativeimage to png buffer (clipboard doesn't support animated gifs)
        image = image.toPNG()
        // Upload/save
        try {
            await this.fromBufferAndFilename(await this.getDefaultUploader(), image, filename)
        } catch(_) {
            await this.fromBufferAndFilename(await this.getDefaultUploader(), image, filename)
        }
    }
}
