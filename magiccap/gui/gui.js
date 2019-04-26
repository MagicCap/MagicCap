// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018-2019.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.
// Copyright (C) Leo Nesfield <leo@thelmgn.com> 2019.

// Allow devtools to be opened (placing this at the top just in case something breaks whilst loading)
document.addEventListener("keydown", function (e) {
    // key is I, and the alt key is held down
    // and also, ctrl (for Linux) or Cmd (meta, macOS) is held down
    if (e.code == "KeyI" && e.altKey && (e.ctrlKey || e.metaKey)) {
        require('electron').remote.getCurrentWindow().toggleDevTools();
    }
});

// Open devtools when things break
window.onerror = function() {
    require('electron').remote.getCurrentWindow().openDevTools();
}

// Gets the lite touch configuration.
const { ipcRenderer, remote, shell } = require("electron")
global.liteTouchConfig = remote.getGlobal("liteTouchConfig")

// The needed imports.
const { dialog } = require("electron").remote
const config = require("./config").config
const saveConfigToDb = require("./config").saveConfig
const { writeJSON, readdir, readJSON } = require("fs-nextra")
const i18n = require("./i18n")
const mconf = require("./mconf")
const Sentry = require("@sentry/electron")
const { AUTOUPDATE_ON } = require("./build_info")

// Initialises the Sentry SDK.
Sentry.init({
    dsn: "https://968dcfa0651e40ddaa807bbe47b1aa91@sentry.io/1396847",
})


// Configures the Sentry scope.
Sentry.configureScope(scope => {
    scope.setUser({ id: config.install_id })
})

// Defines the about menu.
new Vue({
    el: "#about",
    data: {
        liteTouch: global.liteTouchConfig !== undefined,
    },
})

// Handles the sidebar buttons.
new Vue({
    el: "#sidebar",
    data: {
        clipboardAction: global.liteTouchConfig ? global.liteTouchConfig.config_allowed.ClipboardAction : true,
        hotkeyConfig: global.liteTouchConfig ? global.liteTouchConfig.config_allowed.HotkeyConfig : true,
        uploaderConfig: global.liteTouchConfig ? global.liteTouchConfig.config_allowed.UploaderConfig : true,
        betaUpdates: global.liteTouchConfig ? global.liteTouchConfig.config_allowed.BetaUpdates : AUTOUPDATE_ON,
        toggleTheme: global.liteTouchConfig ? global.liteTouchConfig.config_allowed.ToggleTheme : true,
        fileConfig: global.liteTouchConfig ? global.liteTouchConfig.config_allowed.FileConfig : true,
        shortener: global.liteTouchConfig ? global.liteTouchConfig.link_shortener_allowed : true,
    },
})

// Sets the MagicCap version.
document.getElementById("magiccap-ver").innerText = `MagicCap v${remote.app.getVersion()}`

// Changes the colour scheme.
const stylesheet = document.createElement("link")
stylesheet.setAttribute("rel", "stylesheet")

let platform = remote.getGlobal("platform")

if (config.light_theme) {
    stylesheet.setAttribute("href", "../node_modules/bulmaswatch/default/bulmaswatch.min.css")
} else {
    stylesheet.setAttribute("href", "../node_modules/bulmaswatch/darkly/bulmaswatch.min.css")
}
if (platform === "darwin") {
    if (config.light_theme) {
        document.getElementById("sidebar").style.backgroundColor = "rgba(255,255,255,0.5)"
    	document.body.parentElement.style.backgroundColor = "rgba(255,255,255,0.5)"
    } else {
        document.getElementById("sidebar").style.backgroundColor = "rgba(0,0,0,0.5)"
        document.body.parentElement.style.backgroundColor = "rgba(0,0,0,0.5)"
    }
}

// Unhides the body/window when the page has loaded.
window.onload = () => {
    document.body.style.display = "initial"
    ipcRenderer.send("window-show")
}

document.getElementsByTagName("head")[0].appendChild(stylesheet)

// Defines the capture database.
const db = require("better-sqlite3")(`${require("os").homedir()}/magiccap.db`)

// A list of the displayed captures.
const displayedCaptures = []

// Handles each capture.
function getCaptures() {
    displayedCaptures.length = 0
    const stmt = db.prepare("SELECT * FROM captures ORDER BY timestamp DESC")
    for (const i of stmt.iterate()) {
        displayedCaptures.push(i)
    }
}
getCaptures();

(async() => {
    // Defines failure/success.
    const i18nFailure = await i18n.getPoPhrase("Failure", "gui")
    const i18nSuccess = await i18n.getPoPhrase("Success", "gui")

    // Handles the upload list.
    const mainTable = new Vue({
        el: "#mainTableBody",
        data: {
            captures: displayedCaptures,
            successMap: [
                i18nFailure,
                i18nSuccess,
            ],
        },
        methods: {
            rmCapture: async timestamp => {
                db.prepare("DELETE FROM captures WHERE timestamp = ?").run(timestamp)
                await getCaptures()
            },
            openScreenshotURL: async url => {
                await shell.openExternal(url)
            },
            openScreenshotFile: async filePath => {
                await shell.openItem(filePath)
            },
        },
    })
})()

// Defines the clipboard action.
let clipboardAction = 2
if (config.clipboard_action) {
    if (config.clipboard_action <= 0 || config.clipboard_action >= 3) {
        config.clipboard_action = clipboardAction
        saveConfig()
    } else {
        clipboardAction = config.clipboard_action
    }
} else {
    config.clipboard_action = clipboardAction
    saveConfig()
}

// Handles the clipboard actions.
new Vue({
    el: "#clipboardAction",
    data: {
        action: clipboardAction,
    },
    methods: {
        changeAction: async action => {
            config.clipboard_action = action
            await saveConfig()
        },
    },
})

// Handles the clipboard action close button.
function closeClipboardConfig() {
    document.getElementById("clipboardAction").classList.remove("is-active")
}

// Shows the clipboard action settings page.
function showClipboardAction() {
    document.getElementById("clipboardAction").classList.add("is-active")
}

// Handles the beta updates close button.
function closeBetaUpdates() {
    document.getElementById("betaUpdates").classList.remove("is-active")
}

// Shows the beta updates  settings page.
function showBetaUpdates() {
    document.getElementById("betaUpdates").classList.add("is-active")
}

// Handles new screenshots.
ipcRenderer.on("screenshot-upload", async() => {
    await getCaptures()
})

// Runs the fullscreen capture.
async function runCapture() {
    await remote.getGlobal("runCapture")()
}

// Runs GIF capture.
async function runGifCapture() {
    await remote.getGlobal("runCapture")(true)
}


// Shows the about page.
function showAbout() {
    document.getElementById("about").classList.add("is-active")
}

// Handles the about close button.
function closeAbout() {
    document.getElementById("about").classList.remove("is-active")
}

// Opens the MPL 2.0 license in a browser.
function openMPL() {
    shell.openExternal("https://www.mozilla.org/en-US/MPL/2.0")
}

// Saves the config.
async function saveConfig() {
    saveConfigToDb()
    ipcRenderer.send("config-edit", config)
}

// Toggles the theme.
async function toggleTheme() {
    config.light_theme = !config.light_theme
    await saveConfig()
    ipcRenderer.send("restartWindow")
}

// Shows the hotkey config.
function showHotkeyConfig() {
    document.getElementById("hotkeyConfig").classList.add("is-active")
}

// Allows you to close the hotkey config.
async function hotkeyConfigClose() {
    const text = document.getElementById("screenshotHotkey").value
    const gifText = document.getElementById("gifHotkey").value

    if (config.hotkey !== text) {
        if (text === "") {
            config.hotkey = null
            await saveConfig()
        } else {
            config.hotkey = text
            await saveConfig()
        }
    }

    if (config.gif_hotkey !== gifText) {
        if (text === "") {
            config.gif_hotkey = null
            await saveConfig()
        } else {
            config.gif_hotkey = gifText
            await saveConfig()
        }
    }

    ipcRenderer.send("hotkey-change", config)

    document.getElementById("hotkeyConfig").classList.remove("is-active")
}

// Opens the Electron accelerator documentation.
function openAcceleratorDocs() {
    shell.openExternal("https://electronjs.org/docs/api/accelerator")
}

// Handles rendering the hotkey config body.
new Vue({
    el: "#hotkeyConfigBody",
    data: {
        gifHotkey: config.gif_hotkey || "",
        screenshotHotkey: config.hotkey || "",
    },
})

// Repoints path for later.
const sep = require("path").sep

// Handles the file config.
new Vue({
    el: "#fileConfig",
    data: {
        fileConfigCheckboxI: config.save_capture || false,
        fileNamingPatternI: config.file_naming_pattern || "screenshot_%date%_%time%",
        fileSaveFolderI: config.save_path,
    },
    methods: {
        saveItem: (key, configKey, checkbox, path) => {
            let i
            if (checkbox) {
                i = document.getElementById(key).checked
            } else {
                i = document.getElementById(key).value
            }

            if (path) {
                if (!i.endsWith(sep)) {
                    i += sep
                }
            }

            config[configKey] = i
            saveConfig()
        },
    },
})

// Toggles the file config.
const toggleFileConfig = (toggle = false) => document.getElementById("fileConfig").classList[toggle ? "add" : "remove"]("is-active")


// Toggles the MFL config.
const toggleMFLConfig = (toggle = false) => document.getElementById("mflConfig").classList[toggle ? "add" : "remove"]("is-active")

// Defines the active uploader config.
const activeUploaderConfig = new Vue({
    el: "#activeUploaderConfig",
    data: {
        uploader: {
            name: "",
            options: {},
        },
        exception: "",
        userAgent: `MagicCap ${remote.app.getVersion()}; ${config.install_id}`,
    },
    methods: {
        getDefaultValue: option => {
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
                    if (option.type === "token_from_json") {
                        return undefined
                    }
                    return ""
                }
            }
        },
        resetValue(option) {
            delete config[option.value]
            saveConfig()
            this.$forceUpdate()
            optionWebviewBodge(option)
        },
        changeOption: option => {
            let res = document.getElementById(option.value).value
            if (res === "") {
                res = undefined
            }
            switch (option.type) {
                case "integer":
                    res = parseInt(res) || option.default || undefined
                    break
                case "boolean":
                    res = document.getElementById(option.value).checked
                    break
            }
            config[option.value] = res
            saveConfig()
        },
        deleteRow: (key, option) => {
            delete option.items[key]
            config[option.value] = option.items
            activeUploaderConfig.$forceUpdate()
            saveConfig()
        },
        addToTable: option => {
            activeUploaderConfig.exception = ""
            const key = document.getElementById(`Key${option.value}`).value || ""
            const value = document.getElementById(`Value${option.value}`).value || ""
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
        closeActiveConfig() {
            this.$set(this, "exception", "")
            document.getElementById("activeUploaderConfig").classList.remove("is-active")
        },
        setDefaultUploader() {
            this.$set(this, "exception", "")
            for (const optionKey in this.uploader.options) {
                const option = this.uploader.options[optionKey]
                const c = config[option.value]
                if (c === undefined && option.required) {
                    if (option.default) {
                        config[option.value] = option.default
                        saveConfig()
                    } else if (option.type === "integer" && !parseInt(document.getElementById(option.value).value)) {
                        this.exception += "notAnInteger"
                        return
                    } else {
                        this.exception += "requiredStuffMissing"
                        return
                    }
                }
            }

            let view = this
            const uploaders = require(`${__dirname}/uploaders`)
            let filename
            for (const file in uploaders) {
                const import_ = uploaders[file]
                if (import_.name === view.uploader.name) {
                    filename = file
                    break
                }
            }
            config.uploader_type = filename
            saveConfig()
            view.exception += "ayyyyDefaultSaved"
        },
    },
})

// The Art of the Bodge: How I Made The Emoji Keyboard <https://www.youtube.com/watch?v=lIFE7h3m40U>
const optionWebviewBodge = option => {
    setTimeout(() => {
        const x = document.getElementById(option.value)
        if (x) {
            x.addEventListener("did-navigate", async urlInfo => {
                const url = urlInfo.url
                if (url.match(new RegExp(option.endUrlRegex))) {
                    const webContents = document.getElementById(option.value).getWebContents()
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

// Shows the uploader config page.
function showUploaderConfig() {
    document.getElementById("uploaderConfig").classList.add("is-active")
}

// All of the imported uploaders.
importedUploaders = global.importedUploaders = ipcRenderer.sendSync("get-uploaders")

// Renders all of the uploaders.
new Vue({
    el: "#uploaderConfigBody",
    data: {
        uploaders: importedUploaders,
        checkUploadCheckbox: config.upload_capture,
    },
    methods: {
        renderUploader: async(uploader, uploaderKey) => {
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
            document.getElementById("uploaderConfig").classList.remove("is-active")
            document.getElementById("activeUploaderConfig").classList.add("is-active")
        },
        toggleCheckbox() {
            this.$set(this, "checkUploadCheckbox", !this.checkUploadCheckbox)
            config.upload_capture = this.checkUploadCheckbox
            saveConfig()
        },
    },
})

// Hides the uploader config page.
function hideUploaderConfig() {
    document.getElementById("uploaderConfig").classList.remove("is-active")
}

// Handles the MFL config.
new Vue({
    el: "#mflConfig",
    data: {
        currentLang: config.language || "en",
        languages: i18n.langPackInfo,
    },
    methods: {
        changeLanguage(language) {
            this.currentLang = language
            config.language = language
            saveConfig()
        },
    },
})

// Handles exporting the config into a *.mconf file.
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
    }, async filename => {
        if (filename === undefined) {
            return
        }
        if (!filename.endsWith(".mconf")) {
            filename += ".mconf"
        }
        try {
            await writeJSON(filename, exported, {
                spaces: 4,
            })
        } catch (err) {
            console.log(err)
        }
    })
}

// Handles importing the config from a *.mconf file.
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
        multiSelections: false,
        openDirectory: false,
        showsTagField: false,
    }, async filename => {
        if (filename === undefined) {
            return
        }
        let data
        try {
            data = await readJSON(filename[0])
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
                    let parse
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
        action: Boolean(config.beta_channel),
    },
    methods: {
        changeAction: actionBool => {
            this.action = actionBool
            config.beta_channel = actionBool
            saveConfig()
        },
    },
})

// Shows the link shortener.
const showShortener = () => {
    ipcRenderer.send("show-short")
}
