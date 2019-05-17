// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018-2019.

const { AUTOUPDATE_ON } = require(`${__dirname}/build_info`)
const magicImports = require("magicimports")
const { stat, writeFile } = magicImports("fs-nextra")
const { app, dialog } = magicImports("electron")
const { get } = magicImports("chainfetch")
const async_child_process = magicImports("async-child-process")
const sudo = magicImports("sudo-prompt")
const i18n = magicImports("./i18n")
const WebSocket = require("ws")

// Ignores this while the app is open.
const tempIgnore = []

// Defines if a update is running.
let updateRunning = false

// Checks if the autoupdate binaries are installed.
async function checkAutoupdateBin() {
    try {
        await stat(`${require("os").homedir()}/magiccap-updater`)
        return true
    } catch (_) {
        return false
    }
}

// Downloads the needed autoupdate binaries.
async function downloadBin() {
    const githubResp = await get(
        "https://api.github.com/repos/JakeMakesStuff/magiccap-updater/releases"
    ).toJSON()
    const latest = githubResp.body[0]
    let osPart
    switch (process.platform) {
        case "darwin":
            osPart = "mac"
            break
        case "linux":
            osPart = "linux"
    }
    for (const asset of latest.assets) {
        if (asset.name == `magiccap-updater-${osPart}`) {
            const updaterBuffer = await get(asset.browser_download_url).toBuffer()
            await writeFile(`${require("os").homedir()}/magiccap-updater`, updaterBuffer.body)
            await async_child_process.execAsync(`chmod 777 "${require("os").homedir()}/magiccap-updater"`)
            break
        }
    }
}

// Checks for any updates.
async function checkForUpdates() {
    let res
    try {
        res = await get(`https://api.magiccap.me/version/check/${app.getVersion()}?beta=${Boolean(config.beta_channel).toString()}`).toJSON()
    } catch (_) {
        return {
            upToDate: true,
        }
    }
    if (res.status != 200) {
        return {
            upToDate: true,
        }
    }
    if (res.body.updated) {
        return {
            upToDate: true,
        }
    }
    return {
        upToDate: false,
        current: res.body.latest.version,
        changelogs: res.body.changelogs,
    }
}

// Does the update.
async function doUpdate(updateInfo) {
    await new Promise(res => {
        sudo.exec(`"${require("os").homedir()}/magiccap-updater" v${updateInfo.current}`, {
            name: "MagicCap",
        }, error => {
            if (error) {
                console.log(error)
                throw error
            }
            res()
        })
    })
}

// Handles a new update.
async function handleUpdate(updateInfo) {
    if (tempIgnore.indexOf(updateInfo.current) > -1) {
        return
    }

    if (config.ignored_updates !== undefined) {
        if (config.ignored_updates.indexOf(updateInfo.current) > -1) {
            return
        }
    }

    const updateNowi18n = await i18n.getPoPhrase("Update Now", "autoupdate")
    const notNowi18n = await i18n.getPoPhrase("Not Now", "autoupdate")
    const skipi18n = await i18n.getPoPhrase("Skip Release", "autoupdate")
    const messagei18n = await i18n.getPoPhrase("A new version of MagicCap is available.", "autoupdate")
    const detaili18n = await i18n.getPoPhrase("You are on {current} and the latest is {latest}. Here are the changelogs since your current release:\n\n{changelogs}", "autoupdate")

    await dialog.showMessageBox({
        type: "warning",
        buttons: [updateNowi18n, notNowi18n, skipi18n],
        title: "MagicCap",
        message: messagei18n,
        detail: detaili18n.replace("{current}", `v${app.getVersion()}`).replace("{latest}", `v${updateInfo.current}`).replace("{changelogs}", updateInfo.changelogs),
    }, async response => {
        switch (response) {
            case 2:
                if (config.ignored_updates !== undefined) {
                    config.ignored_updates.push(updateInfo.current)
                } else {
                    config.ignored_updates = [updateInfo.current]
                }
                saveConfig()
                break
            case 1:
                tempIgnore.push(updateInfo.current)
                break
            case 0:
                updateRunning = true
                await doUpdate(updateInfo)
                updateRunning = false
        }
    })
}

// Handles the initial HTTP update check.
const runHttpUpdateCheck = async() => {
    if (updateRunning || !config.autoupdate_on) {
        return
    }
    const updateInfo = await checkForUpdates()
    if (!updateInfo.upToDate) {
        updateRunning = true
        await handleUpdate(updateInfo)
        updateRunning = false
    }
}

// Handles WebSocket updates.
const handleWebSocketUpdates = () => {
    let conn
    let retry = 0
    const spawnWs = () => {
        conn = new WebSocket("wss://api.magiccap.me/version/feed")
        let deathByError = false
        conn.on("error", () => {
            deathByError = true
            retry += 1
            console.error(`Update WebSocket failed. Retrying in ${retry} second(s).`)
            setTimeout(() => { conn = spawnWs() }, retry * 1000)
        })
        conn.on("open", () => {
            retry = 0
            console.log("Update WebSocket open.")
            conn.send(JSON.stringify({ t: "watch", beta: true }))
        })
        conn.on("message", async data => {
            data = JSON.parse(data).info
            if (updateRunning || !config.autoupdate_on) {
                return
            }
            if (!config.beta_channel && data.beta) {
                return
            }
            const payload = {
                current: data.version,
                changelogs: data.changelogs,
                upToDate: false,
            }
            updateRunning = true
            await handleUpdate(payload)
            updateRunning = false
        })
    }
    spawnWs()
}

// The actual autoupdate part.
module.exports = async function autoUpdateLoop() {
    if (!AUTOUPDATE_ON) {
        return
    }

    if (config.autoupdate_on === false) {
        // We want undefined to fall through here.
        return
    }

    const binExists = await checkAutoupdateBin()
    if (!binExists) {
        let toContinue = await new Promise(async res => {
            const yesi18n = await i18n.getPoPhrase("Yes", "autoupdate")
            const noi18n = await i18n.getPoPhrase("No", "autoupdate")
            const dontAski18n = await i18n.getPoPhrase("Don't ask again", "autoupdate")
            const messagei18n = await i18n.getPoPhrase("In order for autoupdate to work, MagicCap has to install some autoupdate binaries. Shall I do that? MagicCap will not autoupdate without this.", "autoupdate")
            await dialog.showMessageBox({
                type: "warning",
                buttons: [yesi18n, noi18n, dontAski18n],
                title: "MagicCap",
                message: messagei18n,
            }, async response => {
                let toCont = true
                switch (response) {
                    case 2:
                        toCont = false
                        config.autoupdate_on = false
                        saveConfig()
                        break
                    case 1:
                        toCont = false
                        break
                    case 0:
                        await downloadBin()
                        break
                }
                res(toCont)
            })
        })
        if (!toContinue) {
            return
        }
    }

    if (config.autoupdate_on === false) {
        return
    }

    runHttpUpdateCheck()
    handleWebSocketUpdates()
}
