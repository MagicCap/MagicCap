// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Gets the platform.
import { platform } from "os"
// @ts-ignore
import * as apertureInitialiser from "aperture"
import ffmpegFetcher from "./ffmpeg"
import { spawn } from "child_process"
import * as tempDir from "temp-dir"
import * as uuid from "uuid/v4"
import { promises } from "fs"
const fsNextra = promises

// Imports Aperture if this is macOS.
let aperture: undefined | any
if (platform() === "darwin") {
    aperture = apertureInitialiser()
} else {
    aperture = undefined
}

// Defines if this is recording.
let recording: any = null

// Gets the FFMpeg binary location.
let ffmpeg: any

/**
 * Starts recording.
 * @param {int} fps - The FPS to record at.
 * @param {int} x - The X co-ordinates where to start the recording from.
 * @param {int} y - The Y co-ordinates where to start the recording from.
 * @param {int} width - The width of the recording.
 * @param {int} height - The height of the recording.
 * @param {Screen} displayInfo - The Electron display information.
 * @returns A boolean repersenting if the GIF capture started.
 */
export async function start(fps: number, x: number, y: number, width: number, height: number, displayInfo: { bounds: { height: number }; id: any }) {
    if (recording) {
        throw new Error("Already recording.")
    }

    if (!ffmpeg) {
        ffmpeg = await ffmpegFetcher()
        if (!ffmpeg) {
            return false
        }
    }

    if (aperture) {
        // We're on macOS! We can use the nice library by the Kap team!
        const settings = {
            fps: fps,
            cropArea: {
                x: x,
                y: displayInfo.bounds.height - (y + height),
                width: width,
                height: height,
            },
            screenId: displayInfo.id,
            videoCodec: "h264",
        }
        await aperture.startRecording(settings)
        recording = true
    } else {
        // *sighs*
        const tempFile = `${tempDir}/${uuid()}.mp4`
        const args: string[] = ["-y", "-video_size", `${width}x${height}`, "-framerate", `${fps}`, "-f", "x11grab", "-i", `:0.0+${x},${y}`, tempFile]
        const childProcess = spawn(ffmpeg, args)
        recording = [childProcess, tempFile]
    }
    return true
}

/**
 * Stops recording, encodes the file as a GIF and returns the GIF as a buffer (if mp4 is false).
 * @param {Boolean} mp4 - Defines if this should return a MP4.
 * @returns A buffer with the GIF/MP4 contents.
 */
export async function stop(mp4: boolean) {
    if (!recording) {
        throw new Error("Not recording.")
    }

    let mp4Fp
    if (aperture) {
        // Yay!
        mp4Fp = await aperture.stopRecording()
        recording = null
    } else {
        // Boo!
        const childProcess = recording[0]
        mp4Fp = recording[1]
        recording = null

        await new Promise(res => {
            childProcess.on("close", (code: number) => {
                if (code !== 0) {
                    throw new Error("Recording failed.")
                }
                res()
            })

            childProcess.stdin.setEncoding("utf-8")
            childProcess.stdin.write("q")
        })
    }

    // If MP4 is true, return the MP4 here.
    if (mp4) {
        const buffer = await fsNextra.readFile(mp4Fp)
        await fsNextra.unlink(mp4Fp)
        return buffer
    }

    // This defines the pallete file.
    const paletteFile = `${tempDir}/${uuid()}.png`

    const ffmpegPaleteGen = spawn(
        ffmpeg, [
            "-i", mp4Fp, "-vf", "palettegen", paletteFile,
        ],
    )

    await new Promise(res => {
        ffmpegPaleteGen.on("close", (code: number) => {
            if (code !== 0) {
                throw new Error("GIF encoding failed.")
            }
            res()
        })
    })

    // We now have a MP4 file path. Time to turn it into a GIF!
    const tempFile = `${tempDir}/${uuid()}.gif`

    const ffmpegProcess = spawn(
        ffmpeg, [
            "-i", mp4Fp, "-i", paletteFile, "-lavfi", "paletteuse", tempFile,
        ],
    )

    await new Promise(res => {
        ffmpegProcess.on("close", (code: number) => {
            if (code !== 0) {
                throw new Error("GIF encoding failed.")
            }
            res()
        })
    })

    await fsNextra.unlink(mp4Fp)
    await fsNextra.unlink(paletteFile)
    const buffer = await fsNextra.readFile(tempFile)
    await fsNextra.unlink(tempFile)
    return buffer
}
