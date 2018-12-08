const { stat } = require("fs-nextra");
const { dialog } = require("electron");
const { get } = require("chainfetch");
const { writeFile } = require("fs-nextra");
const async_child_process = require("async-child-process");

// Checks if the autoupdate binaries are installed.
async function checkAutoupdateBin() {
    try {
        await stat("/usr/local/bin/magiccap-updater");
        return true;
    } catch(_) {
        return false;
    }
}

// Downloads the needed autoupdate binaries.
async function downloadBin() {
    const githubResp = await get(
        "https://api.github.com/repos/JakeMakesStuff/magiccap-updater/releases"
    ).toJSON();
    const latest = githubResp.body[0];
    let osPart;
    switch (process.platform) {
        case "darwin":
            osPart = "mac";
            break;
        case "linux":
            osPart = "linux";
    }
    for (const asset of latest.assets) {
        if (asset.name == `magiccap-updater-${osPart}`) {
            const updaterBuffer = await get(asset.browser_download_url).toBuffer();
            await writeFile("/usr/local/bin/magiccap-updater", updaterBuffer.body);
            await async_child_process.execAsync("chmod 777 /usr/local/bin/magiccap-updater");
            break;
        }
    }
}

// The actual autoupdate part.
module.exports = async function autoUpdateLoop(config) {
    if (config.autoupdate_on === false) {
        return;
    }
    const binExists = await checkAutoupdateBin();
    if (!binExists) {
        let toContinue = true;
        await dialog.showMessageBox({
            type: "warning",
            buttons: ["Yes", "No", "Don't ask again"],
            title: "MagicCap",
            message: "In order for autoupdate to work, MagicCap has to install some autoupdate binaries. Shall I do that? MagicCap will not autoupdate without this.",
        }, async response => {
            switch (response) {
                case 2:
                    toContinue = false;
                    config.autoupdate_on = false;
                    // TODO: Config should save here.
                    break;
                case 1:
                    toContinue = false;
                    break;
                case 0:
                    await downloadBin();
            }
        });
        if (!toContinue) {
            return;
        }
    }
    console.log("hi");
}
