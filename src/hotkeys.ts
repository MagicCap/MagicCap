// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Requires stuff.
import { globalShortcut, dialog } from "electron"
import * as i18n from "./i18n"
import config from "./config"

// Declares the capture launchers.
declare const runCapture: (gif: boolean) => Promise<void>
declare const runClipboardCapture: () => Promise<void>

/**
 * Fixes odd capture issues on macOS.
 */
function thisShouldFixMacIssuesAndIdkWhy() {
    console.log("Running capture hotkey.")
}

// Handles hotkey management.
export default async() => {
    globalShortcut.unregisterAll()
    try {
        if (config.o.hotkey) {
            globalShortcut.register(config.o.hotkey, async() => {
                thisShouldFixMacIssuesAndIdkWhy()
                await runCapture(false)
            })
        }
        if (config.o.gif_hotkey) {
            globalShortcut.register(config.o.gif_hotkey, async() => {
                thisShouldFixMacIssuesAndIdkWhy()
                await runCapture(true)
            })
        }
        if (config.o.clipboard_hotkey) {
            globalShortcut.register(config.o.clipboard_hotkey, async() => {
                thisShouldFixMacIssuesAndIdkWhy()
                await runClipboardCapture()
            })
        }
    } catch (_) {
        dialog.showErrorBox("MagicCap", await i18n.getPoPhrase("The hotkey you gave was invalid.", "app"))
    }
}
