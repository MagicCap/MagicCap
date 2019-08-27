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
import liteTouchConfig from "./lite_touch"

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
db.exec("CREATE INDEX IF NOT EXISTS TimestampIndex ON captures(timestamp)")

// Makes sure the plugins table exists.
db.exec("CREATE TABLE IF NOT EXISTS plugins (importName TEXT NOT NULL)")

// Makes sure that the config table exists.
db.exec("CREATE TABLE IF NOT EXISTS `config` (`key` TEXT NOT NULL, `value` TEXT NOT NULL)")
db.exec("CREATE TABLE IF NOT EXISTS tokens (token TEXT NOT NULL, expires INTEGER NOT NULL, uploader TEXT NOT NULL)")

// Requires the config.
import config from "./shared/config"

/**
 * Creates the default config.
 * @returns The default config object.
 */
async function getDefaultConfig() {
    let picsDir = app.getPath("pictures")
    picsDir += `${sep}MagicCap${sep}`
    let defaultConfig = {
        hotkey: null,
        upload_capture: true,
        uploader_type: "magiccap",
        clipboard_action: 2,
        save_capture: true,
        save_path: picsDir,
        light_theme: !await darkThemeInformation(),
        install_id: await newInstallId(),
    }
    await ensureDir(defaultConfig.save_path).catch(async error => {
        if (!(error.errno === -4075 || error.errno === -17)) {
            delete defaultConfig.save_path
        }
    })
    return defaultConfig
}

// Puts the lite touch configuration into memory if it exists.
if (!liteTouchConfig) {
    // Handles the configuration (migration).
    if (Object.keys(config.o).length === 0) {
        if (existsSync(`${homedir()}/magiccap.json`)) {
            const oldConfig = require(`${homedir()}/magiccap.json`)
            unlinkSync(`${homedir()}/magiccap.json`)
            for (const i in oldConfig) {
                config.o[i] = oldConfig[i]
            }
            config.save()
            newInstallId().then(installId => {
                config.o.install_id = installId
                config.save()
            });

            (new Notification({
                title: "Welcome to MagicCap",
                body: "Your old configuration has been migrated. We hope you enjoy this update!",
            })).show()
        } else {
            getDefaultConfig().then((newConfig: any) => {
                for (const i in newConfig) {
                    config.o[i] = newConfig[i]
                }
                config.save()
            })
        }
    } else if (!config.o.install_id) {
        newInstallId().then(installId => {
            config.o.install_id = installId
            config.save()
        })
    }
}

// Requires the app.
require(`${__dirname}/app.js`)
