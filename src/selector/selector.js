// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.
// Copyright (C) Matt Cowley (MattIPv4) <me@mattcowley.co.uk> 2019.

// Defines the primary colour.
let primaryColour = [255, 0, 0]

// Requires Electron.
const electron = require("electron")
const ipcRenderer = electron.ipcRenderer

// Requires sharp.
const sharp = require("sharp")

// Requires async-lock.
const asyncLock = require("async-lock")

// Defines the async lock.
const lock = new asyncLock()

/**
 * Handles running an affect.
 * @param {string} affect - The name of the affect.
 * @param {Buffer} part - The part to run that affect to.
 * @returns {Buffer} The affect applied to the part.
 */
const runAffect = (affect, part) => new Promise(async(res, rej) => {
    try {
        await lock.acquire("affect", async() => {
            await ipcRenderer.send("run-affect", {
                affect, data: part, primaryColour,
            })
            ipcRenderer.once("affect-res", (_, result) => res(result))
        })
    } catch (e) {
        rej(e)
    }
})

// Defines the selection type.
let selectionType = "__cap__"

// Defines all of the selections made across all of the windows.
const selections = {}

// Defines the position of the first click.
let firstClick = null

// This is the element for the selection.
const element = document.getElementById("selection")

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
    }
})

// Handles when the mouse is down.
document.body.onmousedown = async e => {
    if (e.target.matches(".clickable-property")) {
        return
    }

    firstClick = electron.screen.getCursorScreenPoint()
    firstClick.pageX = e.pageX
    firstClick.pageY = e.pageY
}

/**
 * Checks if a number is between other numbers. NUMBERRRRRRS!
 * @param {int} x - The number used for comparison.
 * @param {*} min - The minimum number.
 * @param {*} max - The maximum number.
 * @returns A boolean repersenting if the number is between min and max.
 */
function between(x, min, max) {
    return x >= min && x <= max
}

/**
 * Gets the inbetween windows.
 * @param {*} electronMouse - The Electron mouse input.
 * @returns All inbetween windows in an array.
 */
function getInbetweenWindows(electronMouse) {
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
async function getImageBrightness(url) {
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
            const ctx = canvas.getContext("2d")
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
    const cursorX = document.getElementById("cursorX")
    cursorX.style.left = `${x - (cursorX.getBoundingClientRect().width / 2)}px`
    const cursorY = document.getElementById("cursorY")
    cursorY.style.top = `${y - (cursorY.getBoundingClientRect().height / 2)}px`

    // Update the with new coordinates
    document.getElementById("positions").textContent = `X: ${x} | Y: ${y}`

    // Set the magifier positions
    let magnifyX = x
    let magnifyY = y
    const magnifyOffset = 8
    const magnifyElement = document.getElementById("magnify")
    const positionElement = document.getElementById("position")

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
    const fetchReq = await fetch(`http://127.0.0.1:${payload.server.port}/selector/magnify?key=${payload.server.key}&display=${payload.display}&height=25&width=25&x=${x}&y=${y}`)
    const urlPart = URL.createObjectURL(await fetchReq.blob())

    // Determine brightness & threshold (max 255)
    const brightness = await getImageBrightness(urlPart)
    const brightnessThreshold = 100

    // Decide which crosshair to use
    let crosshair = "crosshair.png"
    if (brightness < brightnessThreshold) crosshair = "crosshair_white.png"

    // Apply new magnifier image & crosshair
    magnifyElement.style.backgroundImage = `url("http://127.0.0.1:${payload.server.port}/root/${crosshair}"), url(${urlPart})`
}
moveSelectorMagnifier()

/**
 * Called when the mouse moves.
 */
document.body.onmousemove = e => {
    moveSelectorMagnifier()
    const thisClick = electron.screen.getCursorScreenPoint()
    ipcRenderer.send(`${payload.uuid}-event-send`, {
        type: "invalidate-selections",
    })

    if (firstClick) {
        element.style.boxShadow = ""
        element.style.width = `${Math.abs(e.pageX - firstClick.pageX)}px`
        element.style.height = `${Math.abs(e.pageY - firstClick.pageY)}px`
        element.style.left = e.pageX - firstClick.pageX < 0 ? `${e.pageX}px` : `${firstClick.pageX}px`
        element.style.top = e.pageY - firstClick.pageY < 0 ? `${e.pageY}px` : `${firstClick.pageY}px`
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
const displayEdits = []

// Defines the background image.
let backgroundImage
(async() => {
    backgroundImage = await (await fetch(payload.imageUrl)).arrayBuffer()
})()

/**
 * Protects against XSS.
 * @param {string} data - The data to sanitise.
 * @returns A sanitised string.
 */
function xssProtect(data) {
    const lt = /</g
    const gt = />/g
    const ap = /'/g
    const ic = /"/g

    return data.replace(lt, "&lt;").replace(gt, "&gt;").replace(ap, "&#39;")
        .replace(ic, "&#34;")
}

// Called when the mouse button goes up.
document.body.onmouseup = async e => {
    const thisClick = electron.screen.getCursorScreenPoint()

    if (e.target.matches(".clickable-property")) {
        return
    }

    let inThese, start, end
    if (e.clientX === firstClick.pageX) {
        inThese = getInbetweenWindows(thisClick)

        if (inThese.length === 0) {
            return
        }
    }

    const posInfo = element.getBoundingClientRect()

    const width = posInfo.width
    const height = posInfo.height

    start = {
        pageX: posInfo.x,
        pageY: posInfo.y,
    }
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
        ipcRenderer.send(`${payload.uuid}-event-send`, {
            type: "selection-made",
            args: selection,
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
        const left = Number(element.style.left.match(/\d+/)[0])
        const top = Number(element.style.top.match(/\d+/)[0])
        const region = await sharp(Buffer.from(backgroundImage))
            .extract({ left, top, width: Number(element.style.width.match(/\d+/)[0]), height: Number(element.style.height.match(/\d+/)[0]) })
            .toBuffer()
        const edit = await runAffect(selectionType, region)
        displayEdits.push({
            left, top, edit,
        })
        selectionBlackness.style.backgroundImage = `url(${URL.createObjectURL(new Blob([edit], { type: "image/png" }))})`
        document.body.appendChild(selectionBlackness)
        element.style.top = "-10px"
        element.style.left = "-10px"
        element.style.width = "0px"
        element.style.height = "0px"
        element.style.boxShadow = "none"
    }
}

// Defines the uploader properties HTML element.
const uploaderProperties = document.getElementById("UploaderProperties")


/**
 * This is called when a button is invoked.
 * @param {int} buttonId - The ID of the button.
 */
function invokeButton(buttonId, sendEvent = true) {
    const newNodes = []
    for (const el of uploaderProperties.childNodes) {
        if (el.nodeName === "A") {
            newNodes.push(el)
        }
    }

    const htmlElement = newNodes[buttonId]
    const button = payload.buttons[buttonId]
    switch (button.type) {
        case "selection": {
            htmlElement.childNodes[1].classList.add("selected")
            for (const thisButtonId in payload.buttons) {
                if (buttonId != thisButtonId) {
                    const thisButton = payload.buttons[thisButtonId]
                    if (thisButton.type === "selection") {
                        newNodes[thisButtonId].childNodes[1].classList.remove("selected")
                    }
                }
            }
            selectionType = button.name
            if (sendEvent) {
                ipcRenderer.send(`${payload.uuid}-event-send`, {
                    type: "selection-type-change",
                    args: {
                        selectionType: selectionType,
                    },
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
            <a href="javascript:invokeButton(${buttonId})" draggable="false"
               data-tooltip="${button.tooltip}" data-tooltip-position="bottom">
                <img class="clickable-property${button.active ? " selected" : ""}" draggable="false"
                     style="padding: 3px" src="/selector/icons/${button.imageLocation}">
            </a>
        `
    }
    uploaderProperties.innerHTML = `${propertyStr}${uploaderProperties.innerHTML}`

    // What in the name of fuck Chrome? This should work in CSS!
    document.getElementById("ColourSelectionEl").style.border = "none"
} else {
    uploaderProperties.innerHTML = ""
}

// Called when a event is recieved from another screen.
ipcRenderer.on("event-recv", (_, res) => {
    if (res.display == payload.display) {
        return
    }
    switch (res.type) {
        case "invalidate-selections": {
            element.style.width = "0px"
            element.style.height = "0px"
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
        }
    }
})

/**
 * Changes the colour in the code.
 */
const changeColour = () => {
    const hex = document.getElementById("ColourSelectionEl").value.substr(1)
    /**
     * Fixes a small edgecase.
     */
    const edgeCaseFix = x => x > 255 ? Math.floor((x / 65535) * 255) : x
    const r = edgeCaseFix(parseInt(hex.substr(0, 2), 16))
    const g = edgeCaseFix(parseInt(hex.substr(2, 4), 16))
    const b = edgeCaseFix(parseInt(hex.substr(4, 6), 16))
    primaryColour = [r, g, b]
    ipcRenderer.send(`${payload.uuid}-event-send`, {
        type: "colour-change",
        args: { primaryColour },
    })
}
