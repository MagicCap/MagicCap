// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.
// Copyright (C) Leo Nesfield <leo@thelmgn.com> 2019.

// Defines the config.
let { config: localConfig, saveConfig } = require("./config")
global.config = localConfig
global.saveConfig = saveConfig

// Main imports.
const magicImports = require("magicimports")
const { readFile } = magicImports("fs-nextra")
const testUploader = require("./test_uploader")
let capture = require(`${__dirname}/capture.js`)
const { app, Tray, Menu, dialog, globalShortcut, BrowserWindow, ipcMain } = magicImports("electron")
const autoUpdateLoop = require(`${__dirname}/autoupdate.js`)
const i18n = magicImports("./i18n")
const { showShortener } = require("./shortener")
const Sentry = require("@sentry/electron")

// All of the loaded uploaders.
global.importedUploaders = {}
global.nameUploaderMap = {}

// Loads all of the uploaders.
const uploaders = require(`${__dirname}/uploaders`)
for (const uploaderName in uploaders) {
    const import_ = uploaders[uploaderName]
    importedUploaders[import_.name] = import_
    nameUploaderMap[uploaderName] = import_.name
}

// Fixes odd capture issues on macOS.
function thisShouldFixMacIssuesAndIdkWhy() {
    console.log("Running capture hotkey.")
}

// Creates a menu on Mac.
const createMenu = async() => {
    const application = {
        label: await i18n.getPoPhrase("Application", "app"),
        submenu: [
            {
                label: await i18n.getPoPhrase("Quit", "app"),
                accelerator: "Command+Q",
                click: () => {
                    app.quit()
                },
            },
        ],
    }
    const edit = {
        label: await i18n.getPoPhrase("Edit", "app"),
        submenu: [
            {
                label: await i18n.getPoPhrase("Undo", "app"),
                accelerator: "CmdOrCtrl+Z",
                selector: "undo:",
            },
            {
                label: await i18n.getPoPhrase("Redo", "app"),
                accelerator: "Shift+CmdOrCtrl+Z",
                selector: "redo:",
            },
            {
                type: "separator",
            },
            {
                label: await i18n.getPoPhrase("Cut", "app"),
                accelerator: "CmdOrCtrl+X",
                selector: "cut:",
            },
            {
                label: await i18n.getPoPhrase("Copy", "app"),
                accelerator: "CmdOrCtrl+C",
                selector: "copy:",
            },
            {
                label: await i18n.getPoPhrase("Paste", "app"),
                accelerator: "CmdOrCtrl+V",
                selector: "paste:",
            },
            {
                label: await i18n.getPoPhrase("Select All", "app"),
                accelerator: "CmdOrCtrl+A",
                selector: "selectAll:",
            },
        ],
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate([application, edit]))
}

// Gets configured uploaders (EXCEPT THE DEFAULT UPLOADER!).
function getConfiguredUploaders() {
    const default_uploader = nameUploaderMap[localConfig.uploader_type]
    let configured = []
    for (const uploaderName in importedUploaders) {
        const uploader = importedUploaders[uploaderName]
        if (default_uploader == uploader.name) {
            continue
        }
        let allOptions = true
        for (const optionName in uploader.config_options) {
            const option = uploader.config_options[optionName]
            if (!(option.value in localConfig) && option.required && !option.default) {
                allOptions = false
                break
            }
        }
        if (allOptions) {
            configured.push(uploader)
        }
    }
    return configured
}

// Starts the autoupdate loop.
autoUpdateLoop()

// Hides the dock icon.
if (app.dock) app.dock.hide()

// Predefines the task tray and window.
let tray, window

// Runs the capture.
async function runCapture(gif) {
    const filename = await capture.createCaptureFilename(gif)
    try {
        const result = await capture.handleScreenshotting(filename, gif)
        capture.throwNotification(result)
    } catch (err) {
        if (err.message !== "Screenshot cancelled.") {
            await capture.logUpload(filename, false, null, null)
            const translatedMessage = await i18n.getPoPhrase(`${err.message}`, "uploaders/exceptions")
            dialog.showErrorBox("MagicCap", translatedMessage)
        }
    }
}
global.runCapture = runCapture

// Runs the clipboard capture
async function runClipboardCapture() {
    const filename = await capture.createCaptureFilename(false)
    try {
        const result = await capture.handleClipboard(filename, false)
        capture.throwNotification(result)
    } catch (err) {
        await capture.logUpload(filename, false, null, null)
        const translatedMessage = await i18n.getPoPhrase(`${err.message}`, "uploaders/exceptions")
        dialog.showErrorBox("MagicCap", translatedMessage)
    }
}
global.runClipboardCapture = runClipboardCapture

// Opens the config.
async function openConfig() {
    if (window) {
        window.show()
        return
    }

    if (app.dock) app.dock.show()

    let vibrancy
    if (process.platform == "darwin") vibrancy = "light"

    window = new BrowserWindow({
        width: 1250, height: 600,
        show: false,
        vibrancy: vibrancy,
        backgroundColor: "#00000000",
        webPreferences: {
            nodeIntegration: true,
        },
    })
    if (process.platform !== "darwin") window.setIcon(`${__dirname}/icons/taskbar.png`)
    global.platform = process.platform
    window.setTitle("MagicCap")
    const pageContent = await i18n.poParseHtml((await readFile(`${__dirname}/gui/index.html`)).toString())
    window.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(pageContent)}`, {
        baseURLForDataURL: `file://${__dirname}/gui/`,
    })
    global.window = window

    window.on("closed", () => {
        window = null
        if (app.dock) app.dock.hide()
    })
}

// Stays alive.
app.on("window-all-closed", () => {
    // Nothing should happen here.
})

// Restart the window on theme change (fixes bug with vibrancy)
ipcMain.on("restartWindow", () => {
    window.close()
    openConfig()
})

// Shows the window.
ipcMain.on("window-show", () => {
    window.show()
})

// Does the dropdown menu uploads.
async function dropdownMenuUpload(uploader) {
    const selectFilei18n = await i18n.getPoPhrase("Select file...", "app")
    await dialog.showOpenDialog({
        title: selectFilei18n,
        multiSelections: false,
        openDirectory: false,
    }, async filePaths => {
        if (filePaths) {
            const path = filePaths[0]
            const buffer = await readFile(path)
            const filename = path
                .split("\\")
                .pop()
                .split("/")
                .pop()
            await capture.fromBufferAndFilename(uploader, buffer, filename, path)
        }
    })
}

// Creates the context menu.
const createContextMenu = async() => {
    let c = localConfig
    let uploadDropdown = []
    const defaulti18n = await i18n.getPoPhrase("(Default)", "app")
    if (nameUploaderMap[c.uploader_type] in importedUploaders) {
        const defaultRealName = nameUploaderMap[c.uploader_type]
        uploadDropdown.push(
            {
                label: `${defaultRealName} ${defaulti18n}`,
                type: "normal",
                click: async() => { await dropdownMenuUpload(importedUploaders[defaultRealName]) },
            }
        )
    }
    for (const uploader of getConfiguredUploaders()) {
        uploadDropdown.push(
            {
                label: uploader.name,
                type: "normal",
                click: async() => { await dropdownMenuUpload(uploader) },
            }
        )
    }
    const i18nCapture = await i18n.getPoPhrase("Screen Capture", "app")
    const i18nGif = await i18n.getPoPhrase("GIF Capture", "app")
    const i18nClipboard = await i18n.getPoPhrase("Clipboard Capture", "app")
    const i18nConfig = await i18n.getPoPhrase("Config", "app")
    const i18nUploadTo = await i18n.getPoPhrase("Upload to...", "app")
    const i18nShort = await i18n.getPoPhrase("Shorten Link...", "app")
    const i18nExit = await i18n.getPoPhrase("Exit", "app")
    const contextMenuTmp = [
        { label: i18nCapture, type: "normal", click: async() => { await runCapture(false) } },
        { label: i18nGif, type: "normal", click: async() => { await runCapture(true) } },
        { label: i18nClipboard, type: "normal", click: async() => { await runClipboardCapture() } },
        { label: i18nConfig, type: "normal", click: openConfig },
        { label: i18nUploadTo, submenu: uploadDropdown },
        { label: i18nExit, type: "normal", role: "quit" },
    ]
    if (global.liteTouchConfig ? global.liteTouchConfig.link_shortener_allowed : true) {
        contextMenuTmp.splice(3, 0, { label: i18nShort, type: "normal", click: showShortener })
    }
    const contextMenu = Menu.buildFromTemplate(contextMenuTmp)
    tray.setContextMenu(contextMenu)
}

// Initialises the script.
let eReady = false
const initialiseScript = async() => {
    eReady = true

    Sentry.configureScope(scope => {
        scope.setUser({ id: localConfig.install_id })
    })

    tray = new Tray(`${__dirname}/icons/taskbar.png`)
    await createContextMenu()
    if (process.platform === "darwin") createMenu()

    if (localConfig.hotkey) {
        try {
            globalShortcut.register(localConfig.hotkey, async() => {
                thisShouldFixMacIssuesAndIdkWhy()
                await runCapture(false)
            })
        } catch (_) {
            dialog.showErrorBox("MagicCap", await i18n.getPoPhrase("The hotkey you gave was invalid.", "app"))
        }
    }

    if (localConfig.gif_hotkey) {
        try {
            globalShortcut.register(localConfig.gif_hotkey, async() => {
                thisShouldFixMacIssuesAndIdkWhy()
                await runCapture(true)
            })
        } catch (_) {
            dialog.showErrorBox("MagicCap", await i18n.getPoPhrase("The hotkey you gave was invalid.", "app"))
        }
    }

    if (localConfig.clipboard_hotkey) {
        try {
            globalShortcut.register(localConfig.clipboard_hotkey, async () => {
                thisShouldFixMacIssuesAndIdkWhy()
                await runClipboardCapture()
            })
        } catch (_) {
            dialog.showErrorBox("MagicCap", await i18n.getPoPhrase("The hotkey you gave was invalid.", "app"))
        }
    }
}

// Shows the link shortener.
ipcMain.on("show-short", () => {
    showShortener()
})

// When the config changes, this does.
ipcMain.on("config-edit", async(event, data) => {
    global.config = data
    localConfig = data
    await createContextMenu()
})

// Tests a uploader.
ipcMain.on("test-uploader", async(event, data) => event.sender.send("test-uploader-res", await testUploader(uploaders[data])))

// Handles the hotkey changing.
ipcMain.on("hotkey-change", async(event, c) => {
    try {
        globalShortcut.unregisterAll()
        if (c.hotkey) {
            globalShortcut.register(c.hotkey, async() => {
                thisShouldFixMacIssuesAndIdkWhy()
                await runCapture(false)
            })
        }
        if (c.gif_hotkey) {
            globalShortcut.register(c.gif_hotkey, async() => {
                thisShouldFixMacIssuesAndIdkWhy()
                await runCapture(true)
            })
        }
        if (c.clipboard_hotkey) {
            globalShortcut.register(c.clipboard_hotkey, async() => {
                thisShouldFixMacIssuesAndIdkWhy()
                await runClipboardCapture()
            })
        }
    } catch (_) {
        dialog.showErrorBox("MagicCap", await i18n.getPoPhrase("The hotkey you gave was invalid.", "app"))
    }
})

// The get uploaders IPC.
ipcMain.on("get-uploaders", event => { event.returnValue = importedUploaders })

// The app is ready to rock!
app.on("ready", initialiseScript)

// Handles unhandled rejections.
process.on("unhandledRejection", async err => console.error(err))

// Makes the app a single instance app.
const shouldExit = !app.requestSingleInstanceLock()
if (shouldExit) {
    app.quit()
}

// If a second instance is spawned, open the config.
app.on("second-instance", () => {
    if (eReady) {
        openConfig()
    }
})

// Opens up the config when clicked in the dock.
app.on("activate", () => {
    if (eReady) {
        openConfig()
    }
})
