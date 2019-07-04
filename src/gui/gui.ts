// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018-2019.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.
// Copyright (C) Leo Nesfield <leo@thelmgn.com> 2019.
// Copyright (C) Matt Cowley (MattIPv4) <me@mattcowley.co.uk> 2019.

// Imports stuff that is needed.
import * as electron from "electron"
import { Scope } from "@sentry/hub"
import Vue from "vue"
import { writeJSON, readJSON } from "fs-nextra"
import * as Sentry from "@sentry/electron"
import * as os from "os"
const { ipcRenderer, remote, shell } = electron
const { dialog, clipboard } = remote

// Handles escape to close.
let activeModal: undefined | string

/**
 * Closes all active modals with correct dismiss actions & shows capture content
 * @param {boolean} [custom=true] - If custom close events should be called (disable if running from inside a custom close event or you'll loop)
 */
function closeCurrentModal(custom = true) {
    // Show table
    document.getElementById("mainTable")!.classList.remove("hidden")

    // Find all active modals
    const all = document.querySelectorAll(".modal.is-active")
    all.forEach(div => {
        if (custom) {
            // Support custom close methods (Use a button with a delete class and onclick event to support this)
            const del = div.querySelector("button.delete")
            // @ts-ignore
            if (del) del.click()
        }

        // Assume normal closing
        div.classList.remove("is-active")
    })

    // Remove activeModal if was set
    if (activeModal) activeModal = undefined
}

/**
 * Shows a new modal based on ID (hides existing modals & capture content)
 * @param {string} id - The string ID of the modal to show
 */
function showModal(id: string) {
    // Get the modal
    const modal = document.getElementById(id)
    if (!modal) return

    // Close existing modals
    closeCurrentModal()

    // Show the modal
    modal.classList.add("is-active")
    activeModal = id

    // Hide captures table
    document.getElementById("mainTable")!.classList.add("hidden")
}

/**
 * Adds a stylesheet to the head of the document
 * @param {string} sheet - The link to the stylesheet to include
 */
function addStylesheet(sheet: string) {
    const stylesheet = document.createElement("link")
    stylesheet.setAttribute("rel", "stylesheet")
    stylesheet.setAttribute("href", sheet)
    document.head.appendChild(stylesheet)
}

// Allow devtools to be opened (placing this at the top just in case something breaks whilst loading)
document.addEventListener("keydown", e => {
    // key is I, and the alt key is held down
    // and also, ctrl (for Linux) or Cmd (meta, macOS) is held down
    if (e.code == "KeyI" && e.altKey && (e.ctrlKey || e.metaKey)) {
        electron.remote.getCurrentWindow().webContents.toggleDevTools()
    }
    // Handles escape to close.
    if (e.code == "Escape") {
        closeCurrentModal()
    }
})

// Open devtools when things break
window.onerror = function() {
    electron.remote.getCurrentWindow().webContents.openDevTools()
}

// Gets the config/stuff that needs it.
const liteTouchConfig = require("./lite_touch").default
const config = require("./config").default
const i18n = require("./i18n")
const mconf = require("./mconf")
const uploaders = require("./uploaders").uploaders
const { default: filename } = require("./filename")
const { AUTOUPDATE_ON } = require("./build_info")

// Initialises the Sentry SDK.
Sentry.init({
    dsn: "https://968dcfa0651e40ddaa807bbe47b1aa91@sentry.io/1396847",
})


// Configures the Sentry scope.
Sentry.configureScope((scope: Scope) => {
    scope.setUser({ id: config.o.install_id })
})

// Defines the about menu.
new Vue({
    el: "#about",
    data: {
        liteTouch: liteTouchConfig !== undefined,
    },
})

// Handles the sidebar buttons.
new Vue({
    el: "#sidebar",
    data: {
        clipboardAction: liteTouchConfig ? liteTouchConfig.config_allowed.ClipboardAction : true,
        hotkeyConfig: liteTouchConfig ? liteTouchConfig.config_allowed.HotkeyConfig : true,
        uploaderConfig: liteTouchConfig ? liteTouchConfig.config_allowed.UploaderConfig : true,
        betaUpdates: liteTouchConfig ? liteTouchConfig.config_allowed.BetaUpdates : AUTOUPDATE_ON,
        toggleTheme: liteTouchConfig ? liteTouchConfig.config_allowed.ToggleTheme : true,
        fileConfig: liteTouchConfig ? liteTouchConfig.config_allowed.FileConfig : true,
        shortener: liteTouchConfig ? liteTouchConfig.link_shortener_allowed : true,
    },
})

// Sets the MagicCap version.
document.getElementById("magiccap-ver")!.innerText = `MagicCap v${remote.app.getVersion()}`

// Sets the colour scheme.
addStylesheet(`css/bulmaswatch/${config.o.light_theme ? "default" : "darkly"}/bulmaswatch.min.css`)
addStylesheet(`css/main.css`)
addStylesheet(`css/${config.o.light_theme ? "light" : "dark"}.css`)

// Unhides the body/window when the page has loaded.
window.onload = () => {
    // Register modal background click to close listeners
    /* Array.from(document.getElementsByClassName("modal-background")).forEach(element => {
        element.addEventListener("click", closeCurrentModal)
    }) */

    // Show the content
    document.body.style.display = "initial"
    ipcRenderer.send("window-show")
}

// Defines the capture database.
const db = require("better-sqlite3")(`${require("os").homedir()}/magiccap.db`)

// A list of the displayed captures.
const displayedCaptures: any[] = []

/**
 * Gets the captures from the database.
 */
function getCaptures() {
    displayedCaptures.length = 0
    const stmt = db.prepare("SELECT * FROM captures ORDER BY timestamp DESC")
    for (const i of stmt.iterate()) {
        displayedCaptures.push(i)
    }
}
getCaptures();

(async() => {
    // Handles the upload list.
    const mainTable = new Vue({
        el: "#mainTableBody",
        data: {
            captures: displayedCaptures,
        },
        methods: {
            rmCapture: async(timestamp: number) => {
                db.prepare("DELETE FROM captures WHERE timestamp = ?").run(timestamp)
                await getCaptures()
            },
            openScreenshotURL: async(url: string) => {
                await shell.openExternal(url)
            },
            openScreenshotFile: async(filePath: string) => {
                await shell.openItem(filePath)
            },
        },
    })
})()

/**
 * Saves the config.
 */
async function saveConfig() {
    config.save()
    ipcRenderer.send("config-edit", config.o)
}

// Defines the clipboard action (and default).
let clipboardAction = 2
if (config.o.clipboard_action) {
    if (config.o.clipboard_action < 0 || config.o.clipboard_action > 2) {
        // If invalid option, reset to default
        config.o.clipboard_action = clipboardAction
        saveConfig()
    } else {
        // Else, use the config option
        clipboardAction = config.o.clipboard_action
    }
} else {
    // If never set, use the default
    config.o.clipboard_action = clipboardAction
    saveConfig()
}

// Handles the clipboard actions.
new Vue({
    el: "#clipboardAction",
    data: {
        action: clipboardAction,
    },
    methods: {
        changeAction: async(action: number) => {
            config.o.clipboard_action = action
            await saveConfig()
        },
    },
})

/**
 * Shows the clipboard action settings page.
 */
function showClipboardAction() {
    showModal("clipboardAction")
}

/**
 * Shows the beta updates settings page.
 */
function showBetaUpdates() {
    showModal("betaUpdates")
}

/**
 * Checks for updates.
 */
async function checkForUpdates(elm: HTMLElement) {
    elm.textContent = await i18n.getPoPhrase("Checking...", "gui")
    // @ts-ignore
    elm.disabled = true
    ipcRenderer.send("check-for-updates")
    ipcRenderer.once("check-for-updates-done", async() => {
        elm.textContent = await i18n.getPoPhrase("Check for Updates", "gui")
        // @ts-ignore
        elm.disabled = false
    })
}

// Handles new screenshots.
ipcRenderer.on("screenshot-upload", async() => {
    await getCaptures()
})

/**
 * Runs the fullscreen capture.
 */
async function runCapture() {
    await remote.getGlobal("runCapture")()
}

/**
 * Runs GIF capture.
 */
async function runGifCapture() {
    await remote.getGlobal("runCapture")(true)
}

/**
 * Runs the Clipboard capture.
 */
async function runClipboardCapture() {
    await remote.getGlobal("runClipboardCapture")()
}

/**
 * Shows the about page.
 */
function showAbout() {
    showModal("about")
}

/**
 * Returns the config with private info redacted
 */
function safeConfig() {
    let newConfig = {} as any
    for (const key in config) {
        let val = config[key]
        if (key.toLowerCase().match(/(\b|_)password(\b|_)/g)) val = "PASSWORD REDACTED"
        if (key.toLowerCase().match(/(\b|_)username(\b|_)/g)) val = "USERNAME REDACTED"
        if (key.toLowerCase().match(/(\b|_)secret(\b|_)/g)) val = "SECRET REDACTED"
        if (key.toLowerCase().match(/(\b|_)token(\b|_)/g)) val = "TOKEN REDACTED"
        if (key.toLowerCase().match(/(\b|_)key(\b|_)/g)) val = "KEY REDACTED"
        newConfig[key] = val
    }
    return newConfig
}

/**
 * Shows the debug information page.
 */
function showDebug() {
    // Generate debug information
    document.getElementById("debugInfo")!.textContent = `MagicCap Version: ${remote.app.getVersion()}
System OS: ${os.type()} ${os.release()} / Platform: ${process.platform}
Installation ID: ${config.o.install_id}
Config: ${JSON.stringify(safeConfig())}
liteTouch Config: ${liteTouchConfig}`
    // Show
    showModal("debug")
}

/**
 * Copies the debug information to clipboard
 */
async function copyDebug() {
    const button = document.getElementById("debugCopy")
    // @ts-ignore
    button!.disabled = true
    clipboard.writeText(document.getElementById("debugInfo")!.textContent!)
    button!.textContent = await i18n.getPoPhrase("Copied!", "gui")
    setTimeout(async() => {
        // @ts-ignore
        button!.disabled = false
        button!.textContent = await i18n.getPoPhrase("Copy to clipboard", "gui")
    }, 3000)
}

/**
 * Shows the file config.
 */
function showFileConfig() {
    showModal("fileConfig")
}

/**
 * Shows the MFL config.
 */
function showMFLConfig() {
    showModal("mflConfig")
}

/**
 * Opens a URL
 * @param {string} url - The URL to open externally
 */
function openURL(url: string) {
    shell.openExternal(url)
}

/**
 * Opens the MPL 2.0 license in a browser.
 */
function openMPL() {
    openURL("https://www.mozilla.org/en-US/MPL/2.0")
}

/**
 * Opens the license for the emoji data in a browser.
 */
function openEmojiLicense() {
    openURL("https://github.com/missive/emoji-mart/blob/master/LICENSE")
}

/**
 * Toggles the theme.
 */
async function toggleTheme() {
    config.o.light_theme = !config.o.light_theme
    await saveConfig()
    ipcRenderer.send("restartWindow")
}

/**
 * Shows the hotkey config.
 */
function showHotkeyConfig() {
    showModal("hotkeyConfig")
}

// Handles the clipboard actions.
new Vue({
    el: "#hotkeyConfig",
    data: {
        gifHotkey: config.o.gif_hotkey || "",
        screenshotHotkey: config.o.hotkey || "",
        clipboardHotkey: config.o.clipboard_hotkey || "",
    },
})

/**
 * Allows you to close the hotkey config.
 */
async function hotkeyConfigClose() {
    // @ts-ignore
    const text = document.getElementById("screenshotHotkey")!.value
    // @ts-ignore
    const gifText = document.getElementById("gifHotkey")!.value
    // @ts-ignore
    const clipboardText = document.getElementById("clipboardHotkey")!.value
    let changed = false

    if (config.o.hotkey !== text) {
        changed = true
        if (text === "") {
            config.o.hotkey = null
        } else {
            config.o.hotkey = text
        }
    }

    if (config.o.gif_hotkey !== gifText) {
        changed = true
        if (gifText === "") {
            config.o.gif_hotkey = null
        } else {
            config.o.gif_hotkey = gifText
        }
    }

    if (config.o.clipboard_hotkey !== clipboardText) {
        changed = true
        if (clipboardText === "") {
            config.o.clipboard_hotkey = null
        } else {
            config.o.clipboard_hotkey = clipboardText
        }
    }

    if (changed) {
        await saveConfig()
        ipcRenderer.send("hotkey-change")
    }

    closeCurrentModal(false)
}

/**
 * Opens the Electron accelerator documentation.
 */
function openAcceleratorDocs() {
    openURL("https://electronjs.org/docs/api/accelerator")
}

// Repoints path for later.
const sep = require("path").sep

// Handles the file config.
new Vue({
    el: "#fileConfig",
    data: {
        fileConfigCheckboxI: config.o.save_capture || false,
        fileNamingPatternI: config.o.file_naming_pattern || "screenshot_%date%_%time%",
        fileSaveFolderI: config.o.save_path,
        fileNamingPreview: filename.newFilename(),
    },
    methods: {
        saveSaveCapture: () => {
            // @ts-ignore
            config.o.save_capture = document.getElementById("fileConfigCheckbox")!.checked
            saveConfig()
        },
        saveNamingPattern: () => {
            // @ts-ignore
            config.o.file_naming_pattern = document.getElementById("fileNamingPattern")!.value
            saveConfig()
            document.getElementById("fileNamingPreview")!.textContent = filename.newFilename()
        },
        saveFilePath: () => {
            // @ts-ignore
            let p = document.getElementById("fileSaveFolder")!.value
            if (!p.endsWith(sep)) p += sep
            config.o.save_path = p
            saveConfig()
        },
    },
})

// Defines the active uploader config.
const activeUploaderConfig = new Vue({
    el: "#activeUploaderConfig",
    data: {
        uploader: {
            name: "",
            options: {} as any,
        },
        exception: "",
        exceptionData: "",
        userAgent: `MagicCap ${remote.app.getVersion()}; ${config.o.install_id}`,
    },
    methods: {
        getDefaultValue: (option: any) => {
            switch (option.type) {
                case "boolean": {
                    const c = config[option.value]
                    if (c === undefined) {
                        if (option.default !== undefined) {
                            return option.default
                        }
                        return false
                    }
                    return c
                }
                default: {
                    if (config[option.value]) {
                        return config[option.value]
                    }
                    if (option.default !== undefined) {
                        return option.default
                    }
                    if (option.type === "token_from_json" || option.type === "oauth2") {
                        return undefined
                    }
                    return ""
                }
            }
        },
        /**
         * Resets a config value.
         */
        resetValue(option: any) {
            delete config[option.value]
            saveConfig()
            this.$forceUpdate()
            optionWebviewBodge(option)
        },
        changeOption: (option: any) => {
            // @ts-ignore
            let res: undefined | string = document.getElementById(option.value)!.value
            if (res === "") {
                res = undefined
            }
            switch (option.type) {
                case "integer":
                    // @ts-ignore
                    res = parseInt(res) || option.default || undefined
                    break
                case "boolean":
                    // @ts-ignore
                    res = document.getElementById(option.value)!.checked
                    break
            }
            config[option.value] = res
            saveConfig()
        },
        deleteRow: (key: string, option: any) => {
            delete option.items[key]
            config[option.value] = option.items
            activeUploaderConfig.$forceUpdate()
            saveConfig()
        },
        addToTable: (option: any) => {
            activeUploaderConfig.exception = ""
            // @ts-ignore
            const key = document.getElementById(`Key${option.value}`)!.value || ""
            // @ts-ignore
            const value = document.getElementById(`Value${option.value}`)!.value || ""
            if (key === "") {
                activeUploaderConfig.exception += "blankKey"
                return
            }
            if (option.items[key] !== undefined) {
                activeUploaderConfig.exception += "keyAlreadyUsed"
                return
            }
            option.items[key] = value
            config[option.value] = option.items
            activeUploaderConfig.$forceUpdate()
            saveConfig()
        },
        /**
         * Closes the active config.
         */
        closeActiveConfig() {
            this.$set(this, "exception", "")
            closeCurrentModal(false)
            showUploaderConfig()
        },
        /**
         * Validates the config.
         */
        validateConfig() {
            this.$set(this, "exception", "")
            this.$set(this, "exceptionData", "")
            for (const optionKey in this.uploader.options) {
                const option = this.uploader.options[optionKey]
                const c = config[option.value]
                if (c === undefined && option.required) {
                    if (option.default) {
                        config[option.value] = option.default
                        saveConfig()
                    // @ts-ignore
                    } else if (option.type === "integer" && !parseInt(document.getElementById(option.value)!.value)) {
                        this.exception += "notAnInteger"
                        return false
                    } else {
                        this.exception += "requiredStuffMissing"
                        return false
                    }
                }
            }
            return true
        },
        /**
         * Gets the uploaders filename.
         */
        getFilename() {
            for (const file in uploaders) {
                const import_ = uploaders[file]
                if (import_.name === this.uploader.name) {
                    return file
                }
            }
        },
        /**
         * Tests the uploader.
         */
        testUploader() {
            if (!this.validateConfig()) {
                return
            }
            const view = this
            document.getElementById("testButton")!.classList.add("is-loading")
            ipcRenderer.send("test-uploader", this.getFilename())
            ipcRenderer.once("test-uploader-res", (_: any, res: any) => {
                document.getElementById("testButton")!.classList.remove("is-loading")
                if (res[0]) {
                    view.exception += "ayyyyTestWorked"
                } else {
                    view.exception += "testFailed"
                    view.exceptionData += res[1]
                }
            })
        },
        /**
         * Sets the uploader as default.
         */
        setDefaultUploader() {
            if (!this.validateConfig()) {
                return
            }

            const file = this.getFilename()
            config.o.uploader_type = file
            saveConfig()
            this.exception += "ayyyyDefaultSaved"
        },
    },
})

/**
 * The Art of the Bodge: How I Made The Emoji Keyboard <https://www.youtube.com/watch?v=lIFE7h3m40U>
 */
const optionWebviewBodge = (option: any) => {
    setTimeout(() => {
        const x = document.getElementById(option.value)
        if (x) {
            x.addEventListener("did-navigate", async urlInfo => {
                const url = ((urlInfo as unknown) as any).url as string
                if (url.match(new RegExp(option.endUrlRegex))) {
                    // @ts-ignore
                    const webContents = document.getElementById(option.value)!.getWebContents() as electron.WebContents
                    const data = JSON.parse(await webContents.executeJavaScript("document.documentElement.innerText")).token
                    if (data) {
                        config[option.value] = data
                        saveConfig()
                        activeUploaderConfig.$set(activeUploaderConfig.uploader.options, option.value, data)
                        activeUploaderConfig.$forceUpdate()
                    }
                }
            })
        }
    }, 200)
}

/**
 * Shows the uploader config page.
 */
function showUploaderConfig() {
    showModal("uploaderConfig")
}

// All of the imported uploaders.
const importedUploaders = ipcRenderer.sendSync("get-uploaders")

// Renders all of the uploaders.
new Vue({
    el: "#uploaderConfigBody",
    data: {
        uploaders: importedUploaders,
        checkUploaderUpload: config.o.upload_capture,
        checkUploaderOpen: config.o.upload_open,
    },
    methods: {
        /**
         * Renders all of the uploaders.
         */
        renderUploader: async(uploader: any, uploaderKey: string) => {
            const options = []
            for (const optionKey in uploader.config_options) {
                const option = uploader.config_options[optionKey]
                const translatedOption = await i18n.getPoPhrase(optionKey, "uploaders/option_names")
                switch (option.type) {
                    case "text":
                    case "integer":
                    case "token_from_json":
                    case "password":
                    case "boolean": {
                        options.push({
                            type: option.type,
                            value: option.value,
                            default: option.default,
                            required: option.required,
                            startUrl: option.startUrl,
                            endUrlRegex: option.endUrlRegex,
                            translatedName: translatedOption,
                        })
                        if (option.type === "boolean") {
                            config[option.value] = config[option.value] || false
                            saveConfig()
                        }

                        optionWebviewBodge(option)
                        break
                    }
                    case "oauth2": {
                        options.push({
                            type: option.type,
                            default: option.default,
                            value: option.value,
                            required: option.required,
                            translatedName: translatedOption,
                        })
                        break
                    }
                    case "object": {
                        const i = config[option.value] || option.default || {}
                        options.push({
                            type: option.type,
                            value: option.value,
                            default: option.default,
                            required: option.required,
                            items: i,
                            translatedName: translatedOption,
                        })
                        config[option.value] = i
                        saveConfig()
                        break
                    }
                }
            }
            activeUploaderConfig.$set(activeUploaderConfig.uploader, "name", uploaderKey)
            activeUploaderConfig.$set(activeUploaderConfig.uploader, "options", options)
            document.getElementById("uploaderConfig")!.classList.remove("is-active")
            document.getElementById("activeUploaderConfig")!.classList.add("is-active")
            activeModal = "activeUploaderConfig"
        },
        /**
         * Toggles the upload checkbox.
         */
        toggleUpload() {
            this.$set(this, "checkUploaderUpload", !this.checkUploaderUpload)
            config.o.upload_capture = this.checkUploaderUpload
            saveConfig()
        },
        /**
         * Toggles the open checkbox.
         */
        toggleOpen() {
            this.$set(this, "checkUploaderOpen", !this.checkUploaderOpen)
            config.o.upload_open = this.checkUploaderOpen
            saveConfig()
        },
    },
})

// Handles the MFL config.
new Vue({
    el: "#mflConfig",
    data: {
        currentLang: config.o.language || "en",
        languages: i18n.langPackInfo,
    },
    methods: {
        /**
         * Sets the language.
         */
        changeLanguage(language: string) {
            this.currentLang = language
            config.o.language = language
            saveConfig()
        },
    },
})

/**
 * Handles exporting the config into a *.mconf file.
 */
const exportMconf = async() => {
    const exported = mconf.new()
    const saveFilei18n = await i18n.getPoPhrase("Save file...", "gui")
    dialog.showSaveDialog({
        title: saveFilei18n,
        filters: [
            {
                extensions: ["mconf"],
                name: "MagicCap Configuration File",
            },
        ],
        showsTagField: false,
    }, async file => {
        if (file === undefined) {
            return
        }
        if (!file.endsWith(".mconf")) {
            file += ".mconf"
        }
        try {
            // @ts-ignore
            await writeJSON(file, exported, {
                spaces: 4,
            })
        } catch (err) {
            console.log(err)
        }
    })
}

/**
 * Handles importing the config from a *.mconf file.
 */
const importMconf = async() => {
    const saveFilei18n = await i18n.getPoPhrase("Open file...", "gui")
    dialog.showOpenDialog({
        title: saveFilei18n,
        filters: [
            {
                extensions: ["mconf"],
                name: "MagicCap Configuration File",
            },
        ],
        // @ts-ignore
        multiSelections: false,
        openDirectory: false,
        showsTagField: false,
    }, async(file: any[]) => {
        if (file === undefined) {
            return
        }
        let data: any
        try {
            data = await readJSON(file[0])
        } catch (err) {
            console.log(err)
            return
        }
        const yesi18n = await i18n.getPoPhrase("Yes", "autoupdate")
        const noi18n = await i18n.getPoPhrase("No", "autoupdate")
        const messagei18n = await i18n.getPoPhrase("This WILL overwrite any values in your MagicCap config which are also in this configuration file. Do you want to continue?", "gui")
        await dialog.showMessageBox({
            type: "warning",
            buttons: [yesi18n, noi18n],
            title: "MagicCap",
            message: messagei18n,
        }, async response => {
            switch (response) {
                case 0: {
                    let parse: any
                    try {
                        parse = await mconf.parse(data)
                    } catch (err) {
                        dialog.showErrorBox("MagicCap", `${err.message}`)
                    }
                    for (const key in parse) {
                        config[key] = parse[key]
                    }
                    await saveConfig()
                    break
                }
            }
        })
    })
}

// Handles beta updates.
new Vue({
    el: "#betaUpdates",
    data: {
        action: Boolean(config.o.beta_channel),
    },
    methods: {
        changeAction: (actionBool: boolean) => {
            // @ts-ignore
            this.action = actionBool
            config.o.beta_channel = actionBool
            saveConfig()
        },
    },
})

/**
 * Shows the link shortener.
 */
const showShortener = () => {
    ipcRenderer.send("show-short")
}

/**
 * Handles authentication via an OAuth2 flow.
 */
async function oauthLogin() {
    document.getElementById("oauthFlowInit")!.classList.add("is-loading")
    await ipcRenderer.send("oauth-flow-uploader", activeUploaderConfig.uploader.name)
    const configDiff = await new Promise(res => {
        ipcRenderer.once("oauth-flow-uploader-response", (_: any, diff: any) => {
            res(diff)
        })
    }) as any
    document.getElementById("oauthFlowInit")!.classList.remove("is-loading")
    if (!configDiff) {
        return
    }
    for (const key of Object.keys(configDiff) as any) {
        config[key] = configDiff[key]
    }
    saveConfig()
    activeUploaderConfig.$forceUpdate()
}
