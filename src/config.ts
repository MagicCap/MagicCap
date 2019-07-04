// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Loads the config stuff.
import liteTouchConfig from "./lite_touch"
import * as SQLite3 from "better-sqlite3"
const db = SQLite3(`${require("os").homedir()}/magiccap.db`)

// The statement to get all configuration options.
const configGetStmt = db.prepare("SELECT * FROM config;")
const configInsertStmt = db.prepare("INSERT INTO config VALUES (?, ?);")

// Places all of the items into the object.
let config = {} as any
if (liteTouchConfig) {
    config = liteTouchConfig.config
}
for (const i of configGetStmt.iterate()) {
    config[i.key] = JSON.parse(i.value)
}

// The config saving transaction.
const configSaveTransaction = db.transaction((newConfig: any) => {
    db.exec("DELETE FROM config")
    for (const i in newConfig) {
        if (newConfig[i] !== undefined) {
            configInsertStmt.run(i, JSON.stringify(newConfig[i]))
        }
    }
})

/**
 * Handles the config.
 */
class ConfigHandler {
    get o() {
        return config
    }

    set o(newConfig: any) {
        config = newConfig
    }

    public save() {
        configSaveTransaction(config)
    }
}

// Exports the config handler.
export default new ConfigHandler()
