// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Gets the platform.
const platform = require("os").platform()

// Imports Aperture if this is macOS.
let aperture
if (platform === "darwin") {
    aperture = require("aperture")()
} else {
    aperture = null
}

// Defines if this is recording.
let recording = null

// Requires the FFMpeg fetcher.
const ffmpegFetcher = require("./ffmpeg")

// Gets the FFMpeg binary location.
let ffmpeg

// Imports child process stuff.
const { spawn } = require("child_process")

// Used to get the temporary directory.
const tempDir = require("temp-dir")

// Defines the UUIDv4 generator.
const uuid = require("uuid/v4")

// Requires FS Nextra for filesystem stuff.
const fsNextra = require("fs-nextra")

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
async function start(fps, x, y, width, height, displayInfo) {
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
        }
        await aperture.startRecording(settings)
        recording = true
    } else {
        // *sighs*
        const tempFile = `${tempDir}/${uuid()}.mp4`
        const args = ["-y", "-video_size", `${width}x${height}`, "-framerate", fps, "-f", "x11grab", "-i", `:0.0+${x},${y}`, tempFile]
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
async function stop(mp4) {
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
            childProcess.on("close", code => {
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
        ffmpegPaleteGen.on("close", code => {
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
        ffmpegProcess.on("close", code => {
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

// Exports start and stop.
module.exports = { start, stop }
