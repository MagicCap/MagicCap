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

// The main capture core.
module.exports = class CaptureCore {
    // Constructs the capture core. If the file type is unknown (such as for clipboard functionality), omit the filetype.
    constructor(buffer, filetype) {
        this._filename = null
        this._log = false
        this._fp = null
        this.filetype = filetype
        this.buffer = buffer
        this.promiseQueue = []
    }

    // Sets the file path if it is known.
    fp(location) {
        this._fp = location
        this.filetype = this._fp.split(".").pop().toLowerCase()
        return this
    }

    // Sets whether to log the result.
    log() {
        this._log = true
        return this
    }

    // Handles throwing notifications.
    notify(result) {
        this.promiseQueue.push(async() => {
            notifier.notify({
                title: "MagicCap",
                message: result,
                icon: `${__dirname}/icons/taskbar@2x.png`,
            })
        })
        return this
    }

    // Logs uploads.
    async _logUpload(filename, success, url, filePath) {
        const timestamp = new Date().getTime()
        await captureStatement.run(filename, Number(success), timestamp, url, filePath)
        try {
            global.window.webContents.send("screenshot-upload", {
                filename: filename,
                success: Number(success),
                timestamp: timestamp,
                url: url,
                file_path: filePath,
            })
        } catch (err) {
            // This isn't too important, we should just ignore.
        }
    }

    // Handles the uploading/saving of the capture.
    upload(uploader) {
        this.promiseQueue.push(async() => {
            try {
                let url
                if (uploader || config.upload_capture) {
                    if (!uploader) {
                        const uploaderType = uploader || config.uploader_type
                        const uploaderName = nameUploaderMap[uploaderType]
                        if (uploaderName === undefined) {
                            const notFoundi18n = await i18n.getPoPhrase("Uploader not found.", "capture")
                            throw new Error(notFoundi18n)
                        }
                        uploader = importedUploaders[uploaderName]
                    }

                    for (const key in uploader.config_options) {
                        if (config[uploader.config_options[key].value] === undefined) {
                            if (uploader.config_options[key].default) {
                                config[uploader.config_options[key].value] = uploader.config_options[key].default
                            } else {
                                const missingOptioni18n = await i18n.getPoPhrase("A required config option is missing.", "capture")
                                throw new Error(missingOptioni18n)
                            }
                        }
                    }
                    url = await uploader.upload(this.buffer, this.filetype, this._filename)
                }
                if (!this._fp && config.save_capture) {
                    // We need to save this and tailor the return.
                    this._fp = `${config.save_path}${this._filename}`
                    await fsnextra.writeFile(this._fp, this.buffer)
                    switch (config.clipboard_action) {
                        case 1: {
                            clipboard.writeImage(
                                nativeImage.createFromBuffer(this.buffer)
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
                } else if (url) {
                    clipboard.writeText(url)
                }
                await this._logUpload(this._filename, true, url, this._fp)
            } catch (e) {
                await this._logUpload(this._filename, false, null, null)
                throw e
            }
        })
        return this
    }

    // Generates a random character
    _getRandomString() {
        const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        return charset.charAt(Math.floor(Math.random() * charset.length))
    }

    // Generates any random emoji
    _getRandomEmoji() {
        // Choose a random
        const emojiArray = Object.values(appleEmojis)
        let emoji = emojiArray[Math.floor(Math.random() * emojiArray.length)]

        // Convert from code point to emoji string
        emoji = String.fromCodePoint(parseInt(emoji.b, 16))
        return emoji
    }

    // Replaces patterns using callbacks.
    _replacePatternCallback(string, pattern, called) {
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

    // Sets the filename.
    filename(name) {
        this.promiseQueue.push(async() => {
            if (name === undefined) {
                // Get pattern
                let setFilename = "screenshot_%date%_%time%"
                if (config.file_naming_pattern) {
                    setFilename = config.file_naming_pattern
                }

                // Sub in fixed patterns
                setFilename = setFilename.replace(/%date%/g, moment().format("DD-MM-YYYY"))
                setFilename = setFilename.replace(/%time%/g, moment().format("HH-mm-ss"))

                // Sub in dynamic patterns
                setFilename = this._replacePatternCallback(setFilename, '"', this._getRandomString)
                setFilename = this._replacePatternCallback(setFilename, "%emoji%", this._getRandomEmoji)

                // Set with correct prefix
                this._filename = `${setFilename}.${this.filetype}`
            } else {
                this._filename = name
            }
        })
        return this
    }

    // Runs all promises in order.
    async run() {
        for (const promise of this.promiseQueue) {
            try {
                await promise()
            } catch (e) {
                if (e.message === "Screenshot cancelled.") {
                    return
                }
                dialog.showErrorBox("MagicCap", `${e.message}`)
                return
            }
        }
    }

    // Allows for clipboard capture.
    static clipboard() {
        const cls = new CaptureCore()
        cls.promiseQueue.push(async() => {
            // Attempt to fetch the nativeimage from the clipboard
            let image = clipboard.readImage()

            // If clipboard cannot be made an image, abort
            if (image.isEmpty()) {
                const noImagei18n = await i18n.getPoPhrase("The clipboard does not contain an image", "capture")
                throw new Error(noImagei18n)
            }

            // Convert nativeimage to png buffer (clipboard doesn't support animated gifs)
            image = image.toPNG()

            // Set up in class.
            cls.filetype = "png"
            cls.buffer = image
        })
        return cls
    }

    // Allows for file uploads.
    static file(buffer, filename, fp) {
        const extension = filename.split(".").pop().toLowerCase()
        const cls = new CaptureCore(buffer, extension)
        cls.filename(filename).fp(fp)
        return cls
    }

    // Allows for upload from the region selection.
    static region(gif) {
        const cls = new CaptureCore(undefined, gif ? "gif" : "png")
        cls.promiseQueue.push(async() => {
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
                cls.buffer = buffer
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

                cls.buffer = cropped
            }
        })
        return cls
    }
}
