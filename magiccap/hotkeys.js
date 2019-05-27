// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Requires stuff.
const { globalShortcut, dialog } = require("electron")
const i18n = require("./i18n")

/**
 * Fixes odd capture issues on macOS.
 */
function thisShouldFixMacIssuesAndIdkWhy() {
    console.log("Running capture hotkey.")
}

// Handles hotkey management.
module.exports = async() => {
    globalShortcut.unregisterAll()
    try {
        if (config.hotkey) {
            globalShortcut.register(config.hotkey, async() => {
                thisShouldFixMacIssuesAndIdkWhy()
                await runCapture(false)
            })
        }
        if (config.gif_hotkey) {
            globalShortcut.register(config.gif_hotkey, async() => {
                thisShouldFixMacIssuesAndIdkWhy()
                await runCapture(true)
            })
        }
        if (config.clipboard_hotkey) {
            globalShortcut.register(config.clipboard_hotkey, async() => {
                thisShouldFixMacIssuesAndIdkWhy()
                await runClipboardCapture()
            })
        }
    } catch (_) {
        dialog.showErrorBox("MagicCap", await i18n.getPoPhrase("The hotkey you gave was invalid.", "app"))
    }
}
