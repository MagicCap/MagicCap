// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Loads the config.
const db = require("better-sqlite3")(`${require("os").homedir()}/magiccap.db`)

// The statement to get all configuration options.
const configGetStmt = db.prepare("SELECT * FROM config;")
const configInsertStmt = db.prepare("INSERT INTO config VALUES (?, ?);")

// Places all of the items into the object.
const config = {}
for (const i of configGetStmt.iterate()) {
    config[i.key] = JSON.parse(i.value)
}

// The config saving transaction.
const configSaveTransaction = db.transaction(newConfig => {
    db.exec("DELETE FROM config")
    for (const i in newConfig) {
        configInsertStmt.run(i, JSON.stringify(newConfig[i]))
    }
})

// Saves the config.
const saveConfig = () => {
    configSaveTransaction(config)
}

// Exports this file.
module.exports = { config, saveConfig }
