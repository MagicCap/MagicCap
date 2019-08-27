// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2019.
// Copyright (C) Matt Cowley (MattIPv4) <me@mattcowley.co.uk> 2019.

// Defines the required imports.
import { ipcMain, BrowserWindow, Display, screen, app } from "electron"
import * as uuidv4 from "uuid/v4"
import * as os from "os"
import * as path from "path"
import { spawn } from "child_process"
import httpBufferPromise from "./http-buffer-promise"
import * as sharp from "sharp"
import { readFile } from "fs-nextra"
import config from "../shared/config"
import expressApp from "../web_server"
import fetch from "node-fetch"

// Defines all UUID's.
let uuids: string[] = []

// Defines all active windows.
let activeWindows: any[] = []

// Defines all of the screenshots.
let screenshots: Buffer[] = []

// Defines all of the buttons.
let globalButtons: any[] = []

// Defines the platform.
const platform = os.platform()
let fullPlatform = platform
if (platform === "win32") {
    fullPlatform += ".exe"
}

// Defines the HTTP server for the Go.
const LOWEST_PORT = 63000
const HIGHEST_PORT = 63999
const port = Math.floor(Math.random() * (+HIGHEST_PORT - +LOWEST_PORT)) + +LOWEST_PORT
const screenshotServer = spawn(`${__dirname}${path.sep}bin${path.sep}screenshot-display-${fullPlatform}`, [`${port}`])
let screenshotServerKey: string
screenshotServer.stdout.on("data", key => {
    if (!screenshotServerKey) {
        screenshotServerKey = key.toString()
    }
})

// Defines all of the routes needed for the actual screenshotting.
expressApp.get("/screenshot", (req, res) => {
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
let selectorHtmlCache: string | null
expressApp.get("/selector/render", async(req, res) => {
    const key = req.query.key
    if (key !== screenshotServerKey) {
        res.status(403)
        res.send("Invalid key.")
    } else {
        const display = Number(req.query.display)
        const imageUrl = `http://127.0.0.1:61222/screenshot?key=${screenshotServerKey}&display=${display}`
        const payload = JSON.stringify({
            display: display,
            uuid: req.query.uuid,
            bounds: JSON.parse(req.query.bounds),
            mainDisplay: req.query.primary === "1",
            activeWindows: activeWindows,
            buttons: globalButtons,
            server: {
                port: 61222,
                key: key,
            },
            imageUrl,
            magnifier: config.o.magnifier === undefined ? true : config.o.magnifier,
        })
        if (!selectorHtmlCache) {
            selectorHtmlCache = (await readFile(`${__dirname}/selector.html`)).toString()
        }
        res.contentType("html")
        res.end(selectorHtmlCache
            .replace("%IMAGE_URL%", `url("${imageUrl}")`)
            .replace("%DARK_MODE%", (config.o.light_theme ? 0 : 1).toString())
            .replace("%PAYLOAD%", payload)
            .replace("%ADD_TO_BODY_IF_LINUX%", process.platform === "linux" ? "background-size: 100%;" : "")
            .replace("%POSSIBLE_CURSOR_PROPERTY%", config.o.hide_cursor === undefined ? "cursor: none" : config.o.hide_cursor ? "cursor: none" : ""))
    }
})
expressApp.get("/selector/js", (_, res) => {
    res.sendFile(`${__dirname}/selector.min.js`)
})
expressApp.get("/selector/font", (_, res) => {
    res.sendFile(`${__dirname}/Roboto-Light.ttf`)
})
expressApp.get("/selector/icons/:icon", (req, res) => {
    res.sendFile(`${path.join(__dirname, "..")}/icons/${path.basename(req.params.icon)}`)
})
expressApp.get("/root/:file", (req, res) => {
    res.sendFile(`${__dirname}/${path.basename(req.params.file)}`)
})
expressApp.get("/css/tooltips", (req, res) => {
    res.sendFile(`${path.join(__dirname, "..")}/gui/css/components/tooltip.css`)
})
expressApp.get("/css/theme", (req, res) => {
    res.sendFile(`${path.join(__dirname, "..")}/gui/css/${config.o.light_theme ? "light" : "dark"}.css`)
})
expressApp.get("/css/selector", (req, res) => {
    res.sendFile(`${__dirname}/selector.css`)
})
let xyImageMap = new Map()
expressApp.get("/selector/magnify", async(req, res) => {
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
            let left = x - Math.round(width / 2)
            let top = y - Math.round(height / 2)

            const metadata = await sharp(screenshots[display]).metadata()

            let topBlackness = 0
            let bottomBlackness = 0
            let leftBlackness = 0
            let rightBlackness = 0

            let captureWidth = width
            let captureHeight = height

            if (top < 0) {
                // Empty space needs to be added to the top.
                topBlackness = top * -1
                top = 0
                captureHeight -= topBlackness
            } else if (height + top > metadata.height!) {
                // Empty space needs to be added to the bottom.
                bottomBlackness = height + top - metadata.height!
                top -= bottomBlackness
                captureHeight -= bottomBlackness
            }

            if (left < 0) {
                // Empty space needs to be added to the left.
                leftBlackness = left * -1
                left = 0
                captureWidth -= leftBlackness
            } else if (left + width > metadata.width!) {
                // Empty space needs to be added to the right.
                rightBlackness = left + width - metadata.width!
                left -= rightBlackness
                captureWidth -= leftBlackness
            }

            if (left < 0) left = 0
            if (top < 0) top = 0
            if (captureHeight < 0) captureHeight = 1
            if (captureWidth < 0) captureWidth = 1

            let captureRegion = await sharp(screenshots[display])
                .extract({ left, top, height: captureHeight, width: captureWidth })
                .toBuffer()

            region = await sharp(captureRegion)
                .extend({ top: topBlackness, bottom: bottomBlackness, left: leftBlackness, right: rightBlackness })
                .toBuffer()

            xyImageMap.set([height, width, x, y, display], region)
        }
        res.contentType("png")
        res.end(region)
    }
})

/**
 * Spawns all the required windows.
 */
const spawnWindows = (displays: Display[], primaryId: any) => {
    const windows = []
    const captureDev = process.argv.includes("-captureDev")
    for (let index in displays) {
        const i = displays[index]
        let win = new BrowserWindow({
            frame: false,
            alwaysOnTop: !captureDev,
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
            if (captureDev) win.webContents.openDevTools()
        })
        win.loadURL(`http://127.0.0.1:61222/selector/render?uuid=${uuid}&primary=${primary ? "1" : "0"}&display=${index}&bounds=${encodeURIComponent(JSON.stringify(bounds))}&key=${screenshotServerKey}`)
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
const getOrderedDisplays = () => screen.getAllDisplays().sort((a, b) => {
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

// Reload the displays in the Go code.
const reloadGoDisplays = () => fetch(`http://127.0.0.1:${port}/reload`)
app.on("ready", () => {
    screen.on("display-added", reloadGoDisplays)
    screen.on("display-removed", reloadGoDisplays)
})

// Defines if the selector is active.
let selectorActive = false

// Defines all active screens.
let screens: BrowserWindow[] = []

// Handles the sending of events.
ipcMain.on("event-send", (_: any, args: any) => {
    for (const browser of screens) {
        browser.webContents.send("event-recv", {
            type: args.type,
            display: args.screenNumber,
            args: args.args,
        })
    }
})

// Opens the region selector.
export default async(buttons: any[]) => {
    if (selectorActive) {
        return
    }

    globalButtons = buttons

    const displays = getOrderedDisplays()

    let primaryId = 0
    const x = screen.getPrimaryDisplay().id
    for (const display of displays) {
        if (display.id === x) {
            break
        }
        primaryId += 1
    }

    activeWindows = []
    if (os.platform() === "darwin") {
        const stdout = await new Promise((res, rej) => {
            const chunks: string[] = []
            const out = spawn(`${__dirname}${path.sep}bin${path.sep}get-visible-windows-darwin`)
            out.stdout.on("data", chunk => {
                chunks.push(chunk.toString())
            })
            out.on("error", e => rej(e))
            out.on("exit", () => res(chunks.join()))
        }) as string
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

    screenshots = await Promise.all(promises) as Buffer[]

    screens = spawnWindows(displays, primaryId)

    selectorActive = true
    const r = await new Promise(res => {
        ipcMain.once("screen-close", async(_: any, args: any) => {
            xyImageMap = new Map()
            selectorActive = false
            const these = screens
            for (const i of these) {
                await i.setAutoHideMenuBar(false)
                await i.setSize(0, 0)
                i.close()
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
                    displayEdits: args.displayEdits,
                })
            }
        })
    })
    screens.length = 0
    return r
}
