// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Requirements for initialisation.
import { existsSync, renameSync, unlinkSync } from "fs"
import { ensureDir } from "fs-nextra"
import darkThemeInformation from "./system_dark_theme"
import { sep, join } from "path"
import { homedir } from "os"
import { app, Notification } from "electron"
import newInstallId from "./install_id"
import { init } from "@sentry/electron"

// ASCII!!!!!1111111!
new Promise(res => {
    res(require("asciiart-logo")(require(`${join(__dirname, "..")}/package.json`)).render())
}).then(render => {
    console.log(render)
})

// Initialises the Sentry SDK.
init({
    dsn: "https://968dcfa0651e40ddaa807bbe47b1aa91@sentry.io/1396847",
})

// Moves the legacy MagicCap captures file to "magiccap.db" if it exists.
if (existsSync(`${homedir()}/magiccap_captures.db`)) {
    renameSync(`${homedir()}/magiccap_captures.db`, `${homedir()}/magiccap.db`)
}

// Imports the DB for further initialisation.
const db = require("better-sqlite3")(`${homedir()}/magiccap.db`)

// Makes sure that the captures table exists.
db.exec("CREATE TABLE IF NOT EXISTS `captures` (`filename` TEXT NOT NULL, `success` INTEGER NOT NULL, `timestamp` INTEGER NOT NULL, `url` TEXT, `file_path` TEXT);")

// Makes sure that the config table exists.
db.exec("CREATE TABLE IF NOT EXISTS `config` (`key` TEXT NOT NULL, `value` TEXT NOT NULL)")

/**
 * Creates the default config.
 * @returns The default config object.
 */
async function getDefaultConfig() {
    let picsDir = app.getPath("pictures")
    picsDir += `${sep}MagicCap${sep}`
    let config = {
        hotkey: null,
        upload_capture: true,
        uploader_type: "magiccap",
        clipboard_action: 2,
        save_capture: true,
        save_path: picsDir,
        light_theme: !await darkThemeInformation(),
        install_id: await newInstallId(),
    }
    await ensureDir(config.save_path).catch(async error => {
        if (!(error.errno === -4075 || error.errno === -17)) {
            delete config["save_path"]
        }
    })
    return config
}

// Puts the lite touch configuration into memory if it exists.
declare const liteTouchConfig: any
if (existsSync("/usr/share/magiccap_deployment_info.json")) {
    // Stop TypeScript complaining about this.
    eval(`global.liteTouchConfig = require("/usr/share/magiccap_deployment_info.json")`)

    if (liteTouchConfig.config.save_path && liteTouchConfig.config.save_path.startsWith("$H")) {
        liteTouchConfig.config.save_path = liteTouchConfig.config.save_path.replace("$H", homedir())
    }
} else {
    // Stop TypeScript complaining about this.
    eval("global.liteTouchConfig = undefined")

    const { config, saveConfig } = require("./config")

    // Handles the configuration (migration).
    if (Object.keys(config).length === 0) {
        if (existsSync(`${homedir()}/magiccap.json`)) {
            const oldConfig = require(`${homedir()}/magiccap.json`)
            unlinkSync(`${homedir()}/magiccap.json`)
            for (const i in oldConfig) {
                config[i] = oldConfig[i]
            }
            saveConfig()
            newInstallId().then(installId => {
                config.install_id = installId
                saveConfig()
            });

            (new Notification({
                title: "Welcome to MagicCap",
                body: "Your old configuration has been migrated. We hope you enjoy this update!",
                // @ts-ignore
                sound: true,
            })).show()
        } else {
            getDefaultConfig().then(newConfig => {
                for (const i in newConfig) {
                    // @ts-ignore
                    config[i] = newConfig[i]
                }
                saveConfig()
            })
        }
    } else if (!config.install_id) {
        newInstallId().then(installId => {
            config.install_id = installId
            saveConfig()
        })
    }
}

// Requires the app.
require(`${__dirname}/app.js`)
