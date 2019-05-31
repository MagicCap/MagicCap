// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Requires stuff.
const { lstat, unlink, chmod } = require("fs-nextra")
const { dialog } = require("electron")
const ProgressBar = require("electron-progressbar")
const i18n = require("./i18n")
const request = require("request")
const requestProgress = require("request-progress")
const os = require("os")
const fs = require("fs")
const asyncChildProcess = require("async-child-process")

/**
 * Downloads the FFMpeg binaries which are needed.
 * @returns A promise to the file path to the FFMpeg binary.
 */
function downloadBin() {
    return new Promise(async done => {
        dialog.showOpenDialog({
            title: "Select the FFMpeg destination/FFMpeg binary...",
            properties: ["openDirectory", "openFile"],
            message: "Select the FFMpeg destination/FFMpeg binary...",
            buttonLabel: "Select",
        }, async fpA => {
            if (!fpA) {
                done()
            }
            for (const fpIndex in fpA) {
                const fp = fpA[fpIndex]
                const fstat = await lstat(fp)
                if (fstat.isFile()) {
                    done(fp)
                } else {
                    let progressBar
                    const tempPath = `${os.tmpdir()}/ffmpeg_magiccap.tar.xz`
                    const promise = new Promise((res, rej) => {
                        requestProgress(request(`https://s3.magiccap.me/ffmpeg/${os.platform() === "linux" ? "linux.tar.xz" : "mac"}`))
                            .on("progress", state => {
                                if (!progressBar) {
                                    progressBar = new ProgressBar({
                                        text: "Downloading FFMpeg...",
                                        detail: "Downloading...",
                                        indeterminate: false,
                                        maxValue: state.size.total,
                                    })
                                    progressBar
                                } else {
                                    progressBar.value += state.size.transferred
                                }
                            })
                            .on("error", err => {
                                progressBar.close()
                                rej(err)
                            })
                            .on("end", () => res())
                            .pipe(os.platform() === "darwin" ? fs.createWriteStream(`${fp}/ffmpeg`) : fs.createWriteStream(tempPath))
                    })
                    try {
                        await promise
                    } catch (_) {
                        // The download failed.
                        await dialog.showMessageBox({
                            type: "error",
                            title: "MagicCap",
                            message: "MagicCap",
                            detail: "File download failed.",
                        })
                        done(null)
                        return
                    }

                    if (os.platform() !== "darwin") {
                        try {
                            await asyncChildProcess.execAsync(`tar -xf "${tempPath}" -C "${fp}/ffmpeg"`)
                        } catch (_) {
                            // The extraction failed.
                            await dialog.showMessageBox({
                                type: "error",
                                title: "MagicCap",
                                message: "MagicCap",
                                detail: "File extraction failed.",
                            })
                            done(null)
                            return
                        }
                        await unlink(tempPath)
                    }

                    await chmod(`${fp}/ffmpeg`, 0777)
                    done(`${fp}/ffmpeg`)
                    return
                }
            }
        })
    })
}

// The main FFMpeg fetcher.
module.exports = async() => {
    if (config.ffmpeg_path && fs.existsSync(config.ffmpeg_path)) {
        return config.ffmpeg_path
    }
    let toContinue = await new Promise(async res => {
        const yesi18n = await i18n.getPoPhrase("Yes", "autoupdate")
        const noi18n = await i18n.getPoPhrase("No", "autoupdate")
        const messagei18n = await i18n.getPoPhrase("In order for GIF capture to work, MagicCap has to download FFMpeg. Shall I start the download process?", "ffmpeg")
        await dialog.showMessageBox({
            type: "warning",
            buttons: [yesi18n, noi18n],
            title: "MagicCap",
            message: "MagicCap",
            detail: messagei18n,
        }, async response => {
            let toCont = true
            let binPath
            switch (response) {
                case 1:
                    toCont = false
                    break
                case 0:
                    binPath = await downloadBin()
                    if (binPath) {
                        config.ffmpeg_path = binPath
                        saveConfig()
                    } else {
                        toCont = false
                    }
                    break
            }
            res(toCont)
        })
    })
    if (!toContinue) {
        return null
    }
}
