// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018-2019.

const { AUTOUPDATE_ON } = require(`${__dirname}/build_info`)
const magicImports = require("magicimports")
const { stat, writeFile } = magicImports("fs-nextra")
const { app, dialog } = magicImports("electron")
const { get } = magicImports("chainfetch")
const asyncChildProcess = magicImports("async-child-process")
const sudo = magicImports("sudo-prompt")
const i18n = magicImports("./i18n")
const WebSocket = require("ws")

// Ignores this while the app is open.
const tempIgnore = []

// Defines if a update is running.
let updateRunning = false

/**
 * Checks if the autoupdate binaries are installed.
 * @returns Boolean saying whether the binary exists.
 */
async function checkAutoupdateBin() {
    try {
        await stat(`${require("os").homedir()}/magiccap-updater`)
        return true
    } catch (_) {
        return false
    }
}

/**
 * Downloads the needed autoupdate binaries.
 */
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
            await asyncChildProcess.execAsync(`chmod 777 "${require("os").homedir()}/magiccap-updater"`)
            break
        }
    }
}

/**
 * Checks for any updates.
 * @returns A object repersenting if it is up to date and changelogs if it is not.
 */
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

/**
 * Does the update.
 * @param {object} updateInfo - The object returned by checkForUpdates.
 */
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

/**
 * Handles a new update.
 * @param {object} updateInfo - A object containing the update information.
 */
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

/**
 * Handles the initial HTTP update check.
 */
async function runHttpUpdateCheck(ignoreConfig) {
    if (updateRunning || (!ignoreConfig && config.autoupdate_on === false)) {
        return
    }
    const updateInfo = await checkForUpdates()
    if (!updateInfo.upToDate) {
        updateRunning = true
        await handleUpdate(updateInfo)
        updateRunning = false
    }
    return updateInfo.upToDate
}


/**
 * Handles WebSocket updates.
 */
async function handleWebSocketUpdates() {
    let retry = 0
    /**
     * Spawns the WebSocket to do the updates with.
     */
    const spawnWs = () => {
        const conn = new WebSocket("wss://api.magiccap.me/version/feed")
        let deathByError = false

        /**
         * Runs on a connection error.
         */
        const err = () => {
            deathByError = true
            retry += 1
            console.error(`Update WebSocket failed. Retrying in ${retry} second(s).`)
            setTimeout(() => spawnWs(), retry * 1000)
        }

        /**
         * Sends the error event.
         */
        conn.on("error", err)

        let heartbeatRes
        /**
         * Handles the heartbeat.
         */
        const handleHeartbeat = async() => {
            if (!deathByError) {
                conn.send(JSON.stringify({ t: "heartbeat" }))
                const heartbeatPromise = new Promise(res => {
                    heartbeatRes = res
                })
                const timeoutPromise = new Promise(res => setTimeout(() => res(false), 3000))
                const res = await Promise.race([heartbeatPromise, timeoutPromise])
                if (!res) {
                    err()
                } else {
                    setTimeout(handleHeartbeat, 1000)
                }
            }
        }

        conn.on("open", () => {
            retry = 0
            console.log("Update WebSocket open.")
            conn.send(JSON.stringify({ t: "watch", beta: true }))
            handleHeartbeat()
        })

        conn.on("message", async data => {
            data = JSON.parse(data)
            if (data.t === "heartbeat_ack") {
                heartbeatRes(true)
                return
            }
            data = data.info
            if (updateRunning || config.autoupdate_on === false) {
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

/**
 * The loop which automatically checks for updates.
 */
async function autoUpdateLoop() {
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

/**
 * Manually checks for updates.
 */
async function manualCheck() {
    if (!AUTOUPDATE_ON) {
        return
    }
    const binExists = await checkAutoupdateBin()
    if (!binExists) {
        const cont = await new Promise(async res => {
            const yesi18n = await i18n.getPoPhrase("Yes", "autoupdate")
            const noi18n = await i18n.getPoPhrase("No", "autoupdate")
            const messagei18n = await i18n.getPoPhrase("In order for autoupdate to work, MagicCap has to install some autoupdate binaries. Shall I do that? MagicCap will not autoupdate without this.", "autoupdate")
            await dialog.showMessageBox({
                type: "warning",
                buttons: [yesi18n, noi18n],
                title: "MagicCap",
                message: messagei18n,
            }, async response => {
                let toCont = true
                switch (response) {
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
        if (!cont) {
            return
        }
    }

    if (await runHttpUpdateCheck(true)) {
        // Show the up to date message.
        await dialog.showMessageBox({
            type: "info",
            title: "MagicCap",
            message: "Update Check",
            detail: "There are currently no updates for your version.",
        })
    }
}
autoUpdateLoop.manualCheck = manualCheck

// Exports the autoupdate function.
module.exports = autoUpdateLoop
