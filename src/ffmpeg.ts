// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Requires stuff.
import { lstat, unlink, chmod } from "fs-nextra"
import { dialog } from "electron"
// @ts-ignore
import * as ProgressBar from "electron-progressbar"
import * as i18n from "./i18n"
import * as request from "request"
// @ts-ignore
import * as requestProgress from "request-progress"
import * as os from "os"
import * as fs from "fs"
import config from "./shared/config"
import { exec } from "child_process"

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
            for (const fpIndexFfsTypeScript in fpA) {
                const fpIndex = (fpIndexFfsTypeScript as unknown) as number
                const fp = fpA[fpIndex]
                const fstat = await lstat(fp)
                if (fstat.isFile()) {
                    done(fp)
                } else {
                    let progressBar: any
                    const tempPath = `${os.tmpdir()}/ffmpeg_magiccap.tar.xz`
                    const promise = new Promise((res, rej) => {
                        requestProgress(request(`https://s3.magiccap.me/ffmpeg/${os.platform() === "linux" ? "linux.tar.xz" : "mac"}`))
                            .on("progress", (state: {
                                size: {
                                    total: number;
                                    transferred: number;
                                };
                            }) => {
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
                            .on("error", (err: Error) => {
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
                            await new Promise((res, rej) => exec(`tar -xf "${tempPath}" -C "${fp}/ffmpeg"`, (err, stdout) => {
                                if (err) {
                                    rej(err)
                                    return
                                }
                                res(stdout)
                            }))
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

                    await chmod(`${fp}/ffmpeg`, 0o777)
                    done(`${fp}/ffmpeg`)
                    return
                }
            }
        })
    })
}

// The main FFMpeg fetcher.
export default async() => {
    if (config.o.ffmpeg_path && fs.existsSync(config.o.ffmpeg_path)) {
        return config.o.ffmpeg_path
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
                        config.o.ffmpeg_path = binPath
                        config.save()
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
