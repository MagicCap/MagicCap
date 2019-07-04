// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.
// Copyright (C) Leo Nesfield <leo@thelmgn.com> 2019.
// Copyright (C) Matt Cowley (MattIPv4) <me@mattcowley.co.uk> 2019.

// Defines the needed stuff.
import config from "./config"
import capture from "./capture"
import liteTouchConfig from "./lite_touch"
import { app, Tray, Menu, dialog, systemPreferences, BrowserWindow, ipcMain } from "electron"
import { readFile } from "fs-nextra"
import testUploader from "./test_uploader"
import autoUpdateLoop from "./autoupdate"
import * as i18n from "./i18n"
import showShortener from "./shortener"
import * as Sentry from "@sentry/electron"
import { AUTOUPDATE_ON } from "./build_info"
import hotkeys from "./hotkeys"
import { uploaders, importedUploaders, nameUploaderMap } from "./uploaders"
import OAuth2 from "./oauth2"
import editors from "./editors"

/**
 * Creates the GUI menu on macOS.
 */
async function createMenu() {
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
    // @ts-ignore
    Menu.setApplicationMenu(Menu.buildFromTemplate([application, edit]))
}

/**
 * Gets configured uploaders (EXCEPT THE DEFAULT UPLOADER!).
 *
 * @returns {Array} All configured uploader objects
 */
function getConfiguredUploaders() {
    const defaultUploader = nameUploaderMap[config.o.uploader_type]
    let configured = []
    for (const uploaderName in importedUploaders) {
        const uploader = importedUploaders[uploaderName]
        if (defaultUploader == uploader.name) {
            continue
        }
        let allOptions = true
        for (const optionName in uploader.config_options) {
            const option = uploader.config_options[optionName]
            if (!(option.value in config) && option.required && !option.default) {
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
let tray: Tray | undefined, window: BrowserWindow | undefined

/**
 *
 * Runs a regular screen capture.
 *
 * @param {boolean} gif - Is the capture a GIF?
 */
async function runCapture(gif: boolean) {
    await capture.region(gif).filename(undefined).upload()
        .notify("Screen capture successful.")
        .log()
        .run()
}
eval("global.runCapture = runCapture")

/**
 * Runs the clipboard capture functionality.
 */
async function runClipboardCapture() {
    await capture.clipboard().filename().upload()
        .notify("Clipboard capture successful.")
        .log()
        .run()
}
eval("global.runClipboardCapture = runClipboardCapture")

/**
 * Opens the configuration GUI.
 */
async function openConfig() {
    const vibrancy = config.o.light_theme ? "light" : "dark"
    if (process.platform === "darwin") systemPreferences.setAppLevelAppearance(vibrancy)

    if (window) {
        window.setVibrancy(vibrancy)
        window.show()
        return
    }

    if (app.dock) app.dock.show()

    /*
     * minWidth: menu.css + table.css + 25 (scrollbar)
     * minHeight: menu.css + 22 (titlebar)
     */
    window = new BrowserWindow({
        width: 1250, height: 600,
        minWidth: 170 + 950 + 25,
        minHeight: 475 + 22,
        show: false,
        vibrancy: vibrancy,
        backgroundColor: "#00000000",
        webPreferences: {
            nodeIntegration: true,
        },
    })
    // @ts-ignore
    if (process.platform !== "darwin") window.setIcon(`${__dirname}/icons/taskbar.png`)
    eval("global.platform = process.platform")
    window.setTitle("MagicCap")
    const pageContent = await i18n.poParseHtml((await readFile(`${__dirname}/gui/index.html`)).toString())
    window.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(pageContent)}`, {
        baseURLForDataURL: `file://${__dirname}/gui/`,
    })
    const captureDev = process.argv.includes("-captureDev")
    if (captureDev) window.webContents.openDevTools()
    eval("global.window = window")

    window.on("closed", () => {
        eval("window = null")
        if (app.dock) app.dock.hide()
    })
}

// Stays alive.
app.on("window-all-closed", () => {
    // Nothing should happen here.
})

// Restart the window on theme change (fixes bug with vibrancy)
ipcMain.on("restartWindow", () => {
    window!.close()
    openConfig()
})

// Shows the window.
ipcMain.on("window-show", () => {
    window!.show()
})

/**
 * Does the dropdown menu uploads.
 * @param {Object} uploader - Defines the uploader to use.
 */
async function dropdownMenuUpload(uploader: any) {
    const selectFilei18n = await i18n.getPoPhrase("Select file...", "app")
    await dialog.showOpenDialog(BrowserWindow.getFocusedWindow()!, {
        title: selectFilei18n,
        // @ts-ignore
        multiSelections: false,
        openDirectory: false,
    }, async(filePaths: string[]) => {
        if (filePaths) {
            const path = filePaths[0]
            const buffer = await readFile(path)
            const filename = path
                .split("\\")
                .pop()!
                .split("/")
                .pop()
            await capture.file(buffer as Buffer, filename as string, path).upload(uploader).notify("File successfully uploaded.")
                .log()
                .run()
        }
    })
}

/**
 * Creates the context menu for the MagicCap application.
 */
async function createContextMenu() {
    let c = config.o
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
    const i18nUploadTo = await i18n.getPoPhrase("Upload File To...", "app")
    const i18nShort = await i18n.getPoPhrase("Shorten Link...", "app")
    const i18nPreferences = await i18n.getPoPhrase("Preferences...", "app")
    const i18nQuit = await i18n.getPoPhrase("Quit", "app")
    const i18nCheckForUpdates = await i18n.getPoPhrase("Check For Updates...", "app")
    const contextMenuTmp = [
        { label: i18nCapture, accelerator: config.o.hotkey, registerAccelerator: false, type: "normal", click: async() => { await runCapture(false) } },
        { label: i18nGif, accelerator: config.o.gif_hotkey, registerAccelerator: false, type: "normal", click: async() => { await runCapture(true) } },
        { label: i18nClipboard, accelerator: config.o.clipboard_hotkey, registerAccelerator: false, type: "normal", click: async() => { await runClipboardCapture() } },
        { type: "separator" },
        { label: i18nUploadTo, submenu: uploadDropdown },
        // Link shortener inserted here if allowed
        { type: "separator" },
        { label: i18nPreferences, type: "normal", click: openConfig },
        // Auto update here if enabled
        { label: i18nQuit, type: "normal", role: "quit" },
    ]
    if (AUTOUPDATE_ON) {
        contextMenuTmp.splice(6, 0, { label: i18nCheckForUpdates, type: "normal", click: autoUpdateLoop.manualCheck })
    }
    if (liteTouchConfig ? liteTouchConfig.link_shortener_allowed : true) {
        // @ts-ignore
        contextMenuTmp.splice(4, 0, { label: i18nShort, type: "normal", click: showShortener })
    }
    // @ts-ignore
    const contextMenu = Menu.buildFromTemplate(contextMenuTmp)
    tray!.setContextMenu(contextMenu)
}

let eReady = false
/**
 * This is used to initialise the MagicCap application.
 */
async function initialiseScript() {
    eReady = true

    Sentry.configureScope(scope => {
        scope.setUser({ id: config.o.install_id })
    })

    tray = new Tray(`${__dirname}/icons/taskbar.png`)
    await createContextMenu()
    if (process.platform === "darwin") {
        systemPreferences.setAppLevelAppearance(config.o.light_theme ? "light" : "dark")
        createMenu()
    }
    await hotkeys()
}

// Shows the link shortener.
ipcMain.on("show-short", () => {
    showShortener()
})

// When the config changes, this does.
ipcMain.on("config-edit", async(event: any, data: any) => {
    config.o = data
    config.save()
    await createContextMenu()
})

// Tests a uploader.
// @ts-ignore
ipcMain.on("test-uploader", async(event: any, data: any) => event.sender.send("test-uploader-res", await testUploader(uploaders[data])))

// Handles the hotkey changing.
ipcMain.on("hotkey-change", async() => {
    hotkeys()
    await createContextMenu()
})

// Allows for update checking in the gui
ipcMain.on("check-for-updates", async(event: any) => {
    await autoUpdateLoop.manualCheck()
    event.sender.send("check-for-updates-done")
})

// The get uploaders IPC.
ipcMain.on("get-uploaders", (event: any) => { event.returnValue = importedUploaders })

// The run affect IPC.
ipcMain.on("run-affect", async(event: any, data: any) => {
    const sentData = data.data
    const affect = data.affect
    const primaryColour = data.primaryColour
    // @ts-ignore
    const res = await editors[affect].apply(sentData, primaryColour)
    event.sender.send("affect-res", res)
})

// Runs any OAuth2 flows for the uploaders.
ipcMain.on("oauth-flow-uploader", async(event: any, uploaderName: string) => {
    const uploader = importedUploaders[uploaderName]
    const oAuthResp = await OAuth2(uploader.getOAuthUrl())
    const r = await uploader.handleOAuthFlow(oAuthResp)
    event.sender.send("oauth-flow-uploader-response", r ? r : null)
})

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
