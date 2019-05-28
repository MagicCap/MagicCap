// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2019.
// Copyright (C) Matt Cowley (MattIPv4) <me@mattcowley.co.uk> 2019.

// Defines the required imports.
const { ipcMain, BrowserWindow } = require("electron")
const uuidv4 = require("uuid/v4")
const os = require("os")
const path = require("path")
const asyncChildProcess = require("async-child-process")
const { spawn } = require("child_process")
const httpBufferPromise = require("./http-buffer-promise")
const express = require("express")
const sharp = require("sharp")
const { readFile } = require("fs-nextra")

// Defines all UUID's.
let uuids = []

// Defines all active windows.
let activeWindows = []

// Defines all of the screenshots.
let screenshots = []

// Defines all of the buttons.
let globalButtons = []

// Defines the platform.
const platform = os.platform()
let fullPlatform = platform
if (platform === "win32") {
    fullPlatform += ".exe"
}

// Defines the HTTP servers.
const LOWEST_PORT = 63000
const HIGHEST_PORT = 63999
const port = Math.floor(Math.random() * (+HIGHEST_PORT - +LOWEST_PORT)) + +LOWEST_PORT
const screenshotServer = spawn(`${__dirname}${path.sep}bin${path.sep}screenshot-display-${fullPlatform}`, [`${port}`])
let screenshotServerKey
screenshotServer.stdout.on("data", key => {
    if (!screenshotServerKey) {
        screenshotServerKey = key.toString()
    }
})
const freezeServerPort = Math.floor(Math.random() * (+HIGHEST_PORT - +LOWEST_PORT)) + +LOWEST_PORT
const freezeServer = express()
freezeServer.get("/", (req, res) => {
    const key = req.query.key
    if (key !== screenshotServerKey) {
        res.status(403)
        res.send("Invalid key.")
    } else {
        const display = Number(req.query.display)
        res.contentType("png")
        res.end(screenshots[display])
    }
})
let selectorHtmlCache
freezeServer.get("/selector/render", async(req, res) => {
    const key = req.query.key
    if (key !== screenshotServerKey) {
        res.status(403)
        res.send("Invalid key.")
    } else {
        const display = Number(req.query.display)
        const payload = JSON.stringify({
            display: display,
            uuid: req.query.uuid,
            bounds: JSON.parse(req.query.bounds),
            mainDisplay: req.query.primary === "1",
            activeWindows: activeWindows,
            buttons: globalButtons,
            server: {
                port: freezeServerPort,
                key: key,
            },
        })
        const imageUrl = `url("http://127.0.0.1:${freezeServerPort}/?key=${screenshotServerKey}&display=${display}")`
        if (!selectorHtmlCache) {
            selectorHtmlCache = (await readFile(`${__dirname}/selector.html`)).toString()
        }
        res.contentType("html")
        res.end(selectorHtmlCache.replace("%IMAGE_URL%", imageUrl).replace("%PAYLOAD%", payload))
    }
})
freezeServer.get("/selector/js", (_, res) => {
    res.sendFile(`${__dirname}/selector.js`)
})
freezeServer.get("/selector/font", (_, res) => {
    res.sendFile(`${__dirname}/Roboto-Light.ttf`)
})
freezeServer.get("/selector/icons/:icon", (req, res) => {
    res.sendFile(`${path.join(__dirname, "..")}/icons/${path.basename(req.params.icon)}`)
})
freezeServer.get("/root/:file", (req, res) => {
    res.sendFile(`${__dirname}/${path.basename(req.params.file)}`)
})
freezeServer.get("/tooltips", (req, res) => {
    res.sendFile(`${path.join(__dirname, "..")}/gui/css/_tooltip.css`)
})
let xyImageMap = new Map()
freezeServer.get("/selector/magnify", async(req, res) => {
    const key = req.query.key
    if (key !== screenshotServerKey) {
        res.status(403)
        res.send("Invalid key.")
    } else {
        const height = Number(req.query.height)
        const width = Number(req.query.width)
        const x = Number(req.query.x)
        const y = Number(req.query.y)
        const display = Number(req.query.display)
        const cache = xyImageMap.get([height, width, x, y, display])
        let region
        if (cache !== undefined) {
            region = cache
        } else {
            const left = x - Math.round(width / 2)
            const top = y - Math.round(height / 2)
            try {
                region = await sharp(screenshots[display])
                    .extract({ left, top, width, height })
                    .toBuffer()
            } catch (_) {
                region = await sharp(screenshots[display])
                    .extract({ left: 0, top: 0, width, height })
                    .toBuffer()
            }
            xyImageMap.set([height, width, x, y, display], region)
        }
        res.contentType("png")
        res.end(region)
    }
})
freezeServer.listen(freezeServerPort, "127.0.0.1")

/**
 * Spawns all the required windows.
 */
const spawnWindows = (displays, primaryId) => {
    const windows = []
    for (let index in displays) {
        const i = displays[index]
        let win = new BrowserWindow({
            frame: false,
            alwaysOnTop: true,
            show: false,
            width: i.bounds.width,
            height: i.bounds.height,
            webPreferences: {
                nodeIntegration: true,
            },
            transparent: true,
        })
        const primary = index == primaryId
        const uuid = uuids[index]
        const bounds = i.bounds
        win.on("ready-to-show", () => {
            win.setFullScreen(true)
            win.show()
            win.focus()
        })
        win.loadURL(`http://127.0.0.1:${freezeServerPort}/selector/render?uuid=${uuid}&primary=${primary ? "1" : "0"}&display=${index}&bounds=${encodeURIComponent(JSON.stringify(bounds))}&key=${screenshotServerKey}`)
        win.setVisibleOnAllWorkspaces(true)
        win.setPosition(i.bounds.x, i.bounds.y)
        win.setMovable(false)
        windows.push(win)
    }
    return windows
}

/**
 * Gets all the displays in order.
 */
const getOrderedDisplays = () => {
    const electronScreen = require("electron").screen
    return electronScreen.getAllDisplays().sort((a, b) => {
        let sub = a.bounds.x - b.bounds.x
        if (sub === 0) {
            if (a.bounds.y > b.bounds.y) {
                sub -= 1
            } else {
                sub += 1
            }
        }
        return sub
    })
}

// Defines if the selector is active.
let selectorActive = false

// Opens the region selector.
module.exports = async buttons => {
    if (selectorActive) {
        return
    }

    globalButtons = buttons

    const electronScreen = require("electron").screen

    const displays = getOrderedDisplays()

    let primaryId = 0
    const x = electronScreen.getPrimaryDisplay().id
    for (const display of displays) {
        if (display.id === x) {
            break
        }
        primaryId += 1
    }

    activeWindows = []
    if (os.platform() === "darwin") {
        const { stdout } = await asyncChildProcess.execAsync(`"${__dirname}${path.sep}bin${path.sep}get-visible-windows-darwin"`)
        const windowsSplit = stdout.trim().split("\n")
        for (const window of windowsSplit) {
            const intRectangleParts = []
            for (const textRectangle of window.split(" ")) {
                intRectangleParts.push(parseInt(textRectangle))
            }
            activeWindows.push({
                x: intRectangleParts[0],
                y: intRectangleParts[1],
                width: intRectangleParts[2],
                height: intRectangleParts[3],
            })
        }
    }

    // Shoves everything in the background.
    uuids = []
    const promises = [];
    (() => {
        for (const displayId in displays) {
            const promise = httpBufferPromise(`http://127.0.0.1:${port}/?key=${screenshotServerKey}&display=${displayId}`)
            promise
            promises.push(promise)
            uuids.push(uuidv4())
        }
    })()

    screenshots = await Promise.all(promises)

    const screens = spawnWindows(displays, primaryId)

    for (const screenNumber in screens) {
        ipcMain.on(`${uuids[screenNumber]}-event-send`, (_, args) => {
            for (const browser of screens) {
                browser.webContents.send("event-recv", {
                    type: args.type,
                    display: screenNumber,
                    args: args.args,
                })
            }
        })
    }
    selectorActive = true
    const r = await new Promise(res => {
        ipcMain.once("screen-close", async(_, args) => {
            xyImageMap = new Map()
            for (const uuid of uuids) {
                await ipcMain.removeAllListeners(`${uuid}-event-send`)
            }
            await ipcMain.removeAllListeners("event-recv")
            selectorActive = false
            const these = screens
            for (const screen of these) {
                await screen.setAutoHideMenuBar(false)
                await screen.setSize(0, 0)
                screen.close()
            }
            if (args === undefined) {
                res(null)
            } else {
                res({
                    start: {
                        x: args.startX,
                        y: args.startY,
                        pageX: args.startPageX,
                        pageY: args.startPageY,
                    },
                    end: {
                        x: args.endX,
                        y: args.endY,
                        pageX: args.endPageX,
                        pageY: args.endPageY,
                    },
                    display: args.display,
                    screenshots: screenshots,
                    activeWindows: activeWindows,
                    selections: args.selections,
                    width: args.width,
                    height: args.height,
                })
            }
        })
    })
    return r
}
