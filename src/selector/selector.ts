// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.
// Copyright (C) Matt Cowley (MattIPv4) <me@mattcowley.co.uk> 2019.

// Declares the payload.
declare const payload: {
    display: number;
    uuid: string;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    mainDisplay: boolean;
    activeWindows: any[];
    buttons: {[key: string]: any};
    server: {
        port: number;
        key: string;
    };
    imageUrl: string;
    magnifier: boolean;
}

// Defines the primary colour.
let primaryColour = [255, 0, 0]

// Requires Electron.
import * as electron from "electron"
const ipcRenderer = electron.ipcRenderer

// Fixes a bug where the opacity is not handled properly.
const c = electron.screen.getCursorScreenPoint()
const d = electron.screen.getDisplayNearestPoint(c)
let visible = d.bounds.x === payload.bounds.x && d.bounds.y === payload.bounds.y
const doms = [
    document.getElementById("magnify"),
    document.getElementById("position"),
    document.getElementById("cursorX"),
    document.getElementById("cursorY"),
    document.getElementById("UploaderProperties"),
]
for (const dom of doms) {
    if (visible) dom!.style.opacity = "1"
    else dom!.style.opacity = "0"
}

// Requires sharp.
import * as sharp from "sharp"

// Requires async-lock.
import * as asyncLock from "async-lock"

// Defines the async lock.
const lock = new asyncLock()

/**
 * Handles running an affect.
 * @param {string} affect - The name of the affect.
 * @param {Buffer} part - The part to run that affect to.
 * @returns {Buffer} The affect applied to the part.
 */
const runAffect = (affect: string, part: Buffer) => new Promise(async(res, rej) => {
    try {
        await lock.acquire("affect", async() => {
            await ipcRenderer.send("run-affect", {
                affect, data: part, primaryColour,
            })
            ipcRenderer.once("affect-res", (_: any, result: Buffer) => res(result))
        })
    } catch (e) {
        rej(e)
    }
})

// Defines the selection type.
let selectionType = "__cap__"

// Defines all of the selections made across all of the windows.
const selections = {} as any

// Defines the position of the first click.
let firstClick: null | any = null

// This is the element for the selection.
const element = document.getElementById("selection")!

// Handles when keys are pushed.
document.addEventListener("keydown", async event => {
    switch (event.key) {
        case "Escape": {
            if (firstClick) {
                firstClick = null
                element.style.top = "-10px"
                element.style.left = "-10px"
                element.style.width = "0px"
                element.style.height = "0px"
                element.style.boxShadow = "none"
            } else {
                await ipcRenderer.send("screen-close")
            }
            break
        }
        case "f": {
            ipcRenderer.send("event-send", {
                type: "fullscreen-send",
                args: {},
                screenNumber: payload.display,
            })
            break
        }
        case "z": {
            if (!event.ctrlKey && !event.metaKey) return
            if (displayEdits.length === 0) return
            const len = displayEdits.length
            const item = document.getElementById(len.toString())!
            item.remove()
            displayEdits.pop()
            break
        }
    }
})

// Defines the uploader properties HTML element.
const uploaderProperties = document.getElementById("UploaderProperties")!

// Handles when the mouse is down.
document.body.onmousedown = async e => {
    if (uploaderProperties.contains(e.target as Node)) return

    firstClick = electron.screen.getCursorScreenPoint()

    // Yeah fuck you Ubuntu.
    const scaleFactor = process.platform === "linux" ? electron.screen.getDisplayNearestPoint(firstClick).scaleFactor : 1

    firstClick.nonScaleAwarePageX = e.pageX
    firstClick.nonScaleAwarePageY = e.pageY
    firstClick.x = Math.floor(firstClick.x * scaleFactor)
    firstClick.y = Math.floor(firstClick.y * scaleFactor)
    firstClick.pageX = Math.floor(e.pageX * scaleFactor)
    firstClick.pageY = Math.floor(e.pageY * scaleFactor)
}

/**
 * Checks if a number is between other numbers. NUMBERRRRRRS!
 * @param {number} x - The number used for comparison.
 * @param {number} min - The minimum number.
 * @param {number} max - The maximum number.
 * @returns A boolean repersenting if the number is between min and max.
 */
function between(x: number, min: number, max: number) {
    return x >= min && x <= max
}

/**
 * Gets the inbetween windows.
 * @param {any} electronMouse - The Electron mouse input.
 * @returns All inbetween windows in an array.
 */
function getInbetweenWindows(electronMouse: any) {
    const inThese = []

    for (const x of payload.activeWindows) {
        if (between(electronMouse.x, x.x, x.x + x.width) && between(electronMouse.y, x.y, x.y + x.height)) {
            inThese.push(x)
        }
    }

    inThese.sort((a, b) => a.width - b.width)

    return inThese
}

/**
 * Determines the brightness of an image
 */
async function getImageBrightness(url: string) {
    return new Promise(resolve => {
        // Create the image
        const image = document.createElement("img")
        image.src = url

        image.onload = () => {
            // Create canvas
            const canvas = document.createElement("canvas")
            canvas.width = image.width
            canvas.height = image.height

            // Apply image
            const ctx = canvas.getContext("2d")!
            ctx.drawImage(image, 0, 0)

            // Get raw image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data
            let colorSum = 0

            // Parse rgb for each pixel
            for (let x = 0; x < imageData.length; x += 4) {
                const r = imageData[x]
                const g = imageData[x + 1]
                const b = imageData[x + 2]

                const avg = Math.floor((r + g + b) / 3)
                colorSum += avg
            }

            // Calc overall average and resolve
            const brightness = Math.floor(colorSum / (image.width * image.height))
            resolve(brightness)
        }
    })
}

/**
 * Moves the selector magnifier.
 */
async function moveSelectorMagnifier() {
    const thisCursor = electron.screen.getCursorScreenPoint()
    let x = thisCursor.x - payload.bounds.x
    let y = thisCursor.y - payload.bounds.y

    // Set the cursor crosshair
    const cursorX = document.getElementById("cursorX")!
    cursorX.style.left = `${x - (cursorX.getBoundingClientRect().width / 2)}px`
    const cursorY = document.getElementById("cursorY")!
    cursorY.style.top = `${y - (cursorY.getBoundingClientRect().height / 2)}px`

    if (!payload.magnifier) return

    // Fuck you too Ubuntu.
    const actualMousePoint = electron.screen.getCursorScreenPoint()
    const theDisplay = electron.screen.getDisplayNearestPoint(actualMousePoint)
    const scaleFactor = process.platform === "linux" ? theDisplay.scaleFactor : 1
    const actualX = Math.floor(actualMousePoint.x * scaleFactor)
    const actualY = Math.floor(actualMousePoint.y * scaleFactor)

    // Update the with new coordinates
    document.getElementById("positions")!.textContent = `X: ${actualX} | Y: ${actualY}`

    // Set the magifier positions
    let magnifyX = x
    let magnifyY = y
    const magnifyOffset = 8
    const magnifyElement = document.getElementById("magnify")!
    const positionElement = document.getElementById("position")!

    // Check if we're overflowing on the y for the magnifier
    if ((magnifyY + magnifyOffset + magnifyElement.getBoundingClientRect().height + positionElement.getBoundingClientRect().height) > window.innerHeight) {
        // Uh oh
        magnifyY -= magnifyOffset + magnifyElement.getBoundingClientRect().height + positionElement.getBoundingClientRect().height
        // Extra offset needed to pad correctly
        magnifyY -= magnifyOffset
    }

    // Check if we're overflowing on the x for the magnifier
    if ((magnifyX + magnifyOffset + magnifyElement.getBoundingClientRect().width) > window.innerWidth) {
        // Uh oh
        magnifyX -= magnifyOffset + magnifyElement.getBoundingClientRect().width
        // Extra offset needed to pad correctly
        magnifyX -= magnifyOffset
    }

    // Set the position of our magnifier
    magnifyElement.style.left = `${magnifyX + magnifyOffset}px`
    magnifyElement.style.top = `${magnifyY + magnifyOffset}px`
    positionElement.style.left = `${magnifyX + magnifyOffset}px`
    positionElement.style.top = `${magnifyY + magnifyOffset + magnifyElement.getBoundingClientRect().height}px`

    // Get the new magnifier image
    const fetchReq = await fetch(`http://127.0.0.1:${payload.server.port}/selector/magnify?key=${payload.server.key}&display=${payload.display}&height=25&width=25&x=${actualX - payload.bounds.x}&y=${actualY - payload.bounds.y}`)
    const urlPart = URL.createObjectURL(await fetchReq.blob())

    // Determine brightness & threshold (max 255)
    const brightness = await getImageBrightness(urlPart)
    const brightnessThreshold = 100

    // Decide which crosshair to use
    let crosshair = "crosshair.png"
    if (brightness as number < brightnessThreshold) crosshair = "crosshair_white.png"

    // Apply new magnifier image & crosshair
    magnifyElement.style.backgroundImage = `url("http://127.0.0.1:${payload.server.port}/root/${crosshair}"), url(${urlPart})`
}
setTimeout(moveSelectorMagnifier, 100)

/**
 * Called when the mouse moves.
 */
document.body.onmousemove = e => {
    if (!visible) {
        visible = true
        for (const dom of doms) dom!.style.opacity = "1"
    }

    moveSelectorMagnifier()
    const thisClick = electron.screen.getCursorScreenPoint()
    ipcRenderer.send("event-send", {
        type: "invalidate-selections",
        screenNumber: payload.display,
    })

    if (firstClick) {
        element.style.boxShadow = ""
        element.style.width = `${Math.abs(e.pageX - firstClick.nonScaleAwarePageX)}px`
        element.style.height = `${Math.abs(e.pageY - firstClick.nonScaleAwarePageY)}px`
        element.style.left = e.pageX - firstClick.nonScaleAwarePageX < 0 ? `${e.pageX}px` : `${firstClick.nonScaleAwarePageX}px`
        element.style.top = e.pageY - firstClick.nonScaleAwarePageY < 0 ? `${e.pageY}px` : `${firstClick.nonScaleAwarePageY}px`
    } else {
        const inThese = getInbetweenWindows(thisClick)

        if (inThese.length === 0) {
            return
        }

        const screenPart = inThese[0]
        element.style.width = `${screenPart.width}px`
        element.style.height = `${screenPart.height}px`
        element.style.left = `${screenPart.x - payload.bounds.x}px`
        element.style.top = `${screenPart.y - payload.bounds.y}px`
    }
}

// Edits that have been made to this display.
const displayEdits: any[] = []

// Defines the background image.
let backgroundImage: ArrayBuffer
(async() => {
    backgroundImage = await (await fetch(payload.imageUrl)).arrayBuffer()
})()

/**
 * Protects against XSS.
 * @param {string} data - The data to sanitise.
 * @returns A sanitised string.
 */
function xssProtect(data: string) {
    const lt = /</g
    const gt = />/g
    const ap = /'/g
    const ic = /"/g

    return data.replace(lt, "&lt;").replace(gt, "&gt;").replace(ap, "&#39;")
        .replace(ic, "&#34;")
}

// Called when the mouse button goes up.
document.body.onmouseup = async e => {
    if (uploaderProperties.contains(e.target as Node)) return

    // Fuck you too Ubuntu.
    const actualMousePoint = electron.screen.getCursorScreenPoint()
    const theDisplay = electron.screen.getDisplayNearestPoint(actualMousePoint)
    const scaleFactor = process.platform === "linux" ? theDisplay.scaleFactor : 1

    const thisClick = electron.screen.getCursorScreenPoint()

    let inThese, start, end
    if (e.clientX === firstClick.pageX) {
        inThese = getInbetweenWindows(thisClick)

        if (inThese.length === 0) {
            return
        }
    }

    const posInfo = element.getBoundingClientRect() as any

    const width = posInfo.width * scaleFactor
    const height = posInfo.height * scaleFactor

    start = {
        pageX: posInfo.x * scaleFactor,
        pageY: posInfo.y * scaleFactor,
    } as any
    start.x = start.pageX + payload.bounds.x
    start.y = start.pageY + payload.bounds.y

    end = {
        x: start.x + width,
        y: start.y + height,
        pageY: start.pageY + height,
        pageX: start.pageX + width,
    }

    if (selectionType === "__cap__") {
        ipcRenderer.send("screen-close", {
            startX: start.x,
            startY: start.y,
            startPageX: start.pageX,
            startPageY: start.pageY,
            endX: end.x,
            endY: end.y,
            endPageX: end.pageX,
            endPageY: end.pageY,
            display: payload.display,
            selections: selections,
            width: width,
            height: height,
            displayEdits,
        })
    } else {
        const selection = {
            display: payload.display,
            selectionType: selectionType,
            startX: start.x,
            startY: start.y,
            startPageX: start.pageX,
            startPageY: start.pageY,
            endX: end.x,
            endY: end.y,
            endPageX: end.pageX,
            endPageY: end.pageY,
        }
        ipcRenderer.send("event-send", {
            type: "selection-made",
            args: selection,
            screenNumber: payload.display,
        })
        if (selections[selectionType]) {
            selections[selectionType].push(selection)
        } else {
            selections[selectionType] = [selection]
        }
        firstClick = null
        const selectionBlackness = document.createElement("div")
        selectionBlackness.classList.add("selection-container")
        selectionBlackness.style.width = element.style.width
        selectionBlackness.style.height = element.style.height
        selectionBlackness.style.left = element.style.left
        selectionBlackness.style.top = element.style.top
        selectionBlackness.style.bottom = element.style.bottom
        selectionBlackness.style.right = element.style.right
        const left = Math.floor(Number(element.style.left!.match(/\d+/)![0]) * scaleFactor)
        const top = Math.floor(Number(element.style.top!.match(/\d+/)![0]) * scaleFactor)
        const region = await sharp(Buffer.from(backgroundImage))
            .extract({ left, top, width: Math.floor(Number(element.style.width!.match(/\d+/)![0]) * scaleFactor), height: Math.floor(Number(element.style.height!.match(/\d+/)![0]) * scaleFactor) })
            .toBuffer()
        const edit = await runAffect(selectionType, region)
        displayEdits.push({
            left, top, edit,
        })
        selectionBlackness.style.backgroundImage = `url(${URL.createObjectURL(new Blob([edit] as BlobPart[], { type: "image/png" }))})`
        selectionBlackness.id = displayEdits.length.toString()
        document.body.appendChild(selectionBlackness)
        element.style.top = "-10px"
        element.style.left = "-10px"
        element.style.width = "0px"
        element.style.height = "0px"
        element.style.boxShadow = "none"
    }
}


/**
 * This is called when a button is invoked.
 * @param {int} buttonId - The ID of the button.
 */
function invokeButton(buttonId: string, sendEvent = true) {
    const newNodes = []
    for (const el of uploaderProperties.children) {
        const a = el.querySelector("a")
        if (a) newNodes.push(a)
    }

    const htmlElement = (newNodes as any)[buttonId]
    const button = payload.buttons[buttonId]
    switch (button.type) {
        case "selection": {
            htmlElement.parentElement!.classList.add("selected")
            for (const thisButtonId in payload.buttons) {
                if (buttonId != thisButtonId) {
                    const thisButton = payload.buttons[thisButtonId]
                    if (thisButton.type === "selection") {
                        (newNodes as any)[thisButtonId].parentElement.classList.remove("selected")
                    }
                }
            }
            selectionType = button.name
            if (sendEvent) {
                ipcRenderer.send("event-send", {
                    type: "selection-type-change",
                    args: {
                        selectionType: selectionType,
                    },
                    screenNumber: payload.display,
                })
            }
            break
        }
    }
}

// Handles displaying the buttons.
if (payload.buttons) {
    let propertyStr = ""
    for (const buttonId in payload.buttons) {
        const button = payload.buttons[buttonId]
        propertyStr += `
            <span data-tooltip="${button.tooltip}" data-tooltip-position="bottom"
                  class="${button.active ? "selected" : ""}">
                <a href="javascript:invokeButton(${buttonId})" draggable="false">
                    <img draggable="false" src="/selector/icons/${button.imageLocation}"/>
                </a>
            </span>
        `
    }
    uploaderProperties.innerHTML = `${propertyStr}${uploaderProperties.innerHTML}`

    // What in the name of fuck Chrome? This should work in CSS!
    document.getElementById("ColourSelectionEl")!.style.border = "none"
} else {
    uploaderProperties.innerHTML = ""
}

// Is this a botch? Yes. Does it stop a infinite loop? Yes.
let doNotCallColourEdit = false

// Called when a event is recieved from another screen.
ipcRenderer.on("event-recv", (_: any, res: any) => {
    if (res.display == payload.display && res.type !== "fullscreen-send") {
        return
    }
    switch (res.type) {
        case "invalidate-selections": {
            for (const dom of doms) dom!.style.opacity = "0"
            visible = false
            element.style.width = "0px"
            element.style.height = "0px"
            break
        }
        case "fullscreen-send": {
            const cursor = electron.screen.getCursorScreenPoint()

            if (electron.screen.getDisplayNearestPoint(cursor).bounds.x !== payload.bounds.x && electron.screen.getDisplayNearestPoint(cursor).bounds.y !== payload.bounds.y) return

            ipcRenderer.send("screen-close", {
                startX: payload.bounds.x,
                startY: payload.bounds.y,
                startPageX: 0,
                startPageY: 0,
                endX: payload.bounds.x + payload.bounds.width,
                endY: payload.bounds.y + payload.bounds.height,
                endPageX: payload.bounds.width,
                endPageY: payload.bounds.height,
                display: payload.display,
                selections: selections,
                width: payload.bounds.width,
                height: payload.bounds.height,
                displayEdits,
            })
            break
        }
        case "selection-type-change": {
            selectionType = res.args.selectionType
            for (const selectorId in payload.buttons) {
                if (payload.buttons[selectorId].name === selectionType) {
                    invokeButton(selectorId, false)
                }
            }
            break
        }
        case "selection-made": {
            if (selections[res.args.selectionType]) {
                selections[res.args.selectionType].push(res.args)
            } else {
                selections[res.args.selectionType] = [res.args]
            }
            break
        }
        case "colour-change": {
            primaryColour = res.args.primaryColour
            doNotCallColourEdit = true;
            (document.getElementById("ColourSelectionEl")! as HTMLInputElement).value = res.args.hex
            doNotCallColourEdit = false
        }
    }
})

/**
 * Changes the colour in the code.
 */
const changeColour = () => {
    if (doNotCallColourEdit) {
        return
    }
    const hex = (document.getElementById("ColourSelectionEl")! as HTMLInputElement).value.substr(1)
    /**
     * Fixes a small edgecase.
     */
    const edgeCaseFix = (x: number) => x > 255 ? Math.floor((x / 65535) * 255) : x
    const r = edgeCaseFix(parseInt(hex.substr(0, 2), 16))
    const g = edgeCaseFix(parseInt(hex.substr(2, 4), 16))
    const b = edgeCaseFix(parseInt(hex.substr(4, 6), 16))
    primaryColour = [r, g, b]
    ipcRenderer.send("event-send", {
        type: "colour-change",
        args: { primaryColour, hex: `#${hex}` },
        screenNumber: payload.display,
    })
}
