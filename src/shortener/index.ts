// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Imports the things.
import { BrowserWindow, NativeImage } from "electron"
import * as path from "path"

// Defines the window.
let shortenerWindow: BrowserWindow | null = null

/**
 * Spawns the shortener window.
 */
export default function showShortener() {
    if (shortenerWindow) {
        shortenerWindow.show()
        return
    }
    shortenerWindow = new BrowserWindow({
        width: 500, height: 200,
        show: false, minimizable: false,
        maximizable: false, alwaysOnTop: true,
        minWidth: 500, minHeight: 200,
        webPreferences: {
            nodeIntegration: true,
        },
    })
    if (process.platform !== "darwin") {
        shortenerWindow.setIcon(
            NativeImage.createFromPath(`${path.join(__dirname, "..")}/icons/taskbar.png`)
        )
    }
    shortenerWindow.setTitle("MagicCap Link Shortener")
    shortenerWindow.loadFile(`${__dirname}/index.html`)

    shortenerWindow.on("closed", () => {
        shortenerWindow = null
    })

    shortenerWindow.once("ready-to-show", () => {
        shortenerWindow!.show()
    })
}
