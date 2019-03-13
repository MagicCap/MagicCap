// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.

const { stat, writeFile, writeJSON } = require("fs-nextra")
const { app, dialog } = require("electron")
const { get } = require("chainfetch")
const async_child_process = require("async-child-process")
const sudo = require("sudo-prompt")
const i18n = require("./i18n")

// Checks if the autoupdate binaries are installed.
async function checkAutoupdateBin() {
    try {
        await stat(`${require("os").homedir()}/magiccap-updater`)
        return true
    } catch (_) {
        return false
    }
}

// Makes the JS code sleep.
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

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
async function handleUpdate(updateInfo, config, tempIgnore) {
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
                await doUpdate(updateInfo)
        }
    })
}

// The actual autoupdate part.
module.exports = async function autoUpdateLoop() {
    if (config.autoupdate_on === false) {
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
    let tempIgnore = []
    for (;;) {
        const updateInfo = await checkForUpdates()
        if (!updateInfo.upToDate) {
            await handleUpdate(updateInfo, config, tempIgnore)
        }
        await sleep(600000)
    }
}
