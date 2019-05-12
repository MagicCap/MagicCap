// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Requires the various things which are needed.
const { ipcRenderer } = require("electron")

// Gets the display number.
const screenNumber = Number(window.location.hash.substr(1))

// Where display information will be defined.
let displayInfo

// Defines the selection type.
let selectionType = "__cap__"

// Defines all of the selections made across all of the windows.
const selections = {}

// Handles when keys are pushed.
document.addEventListener("keydown", async event => {
    switch (event.key) {
        case "Escape": {
            await ipcRenderer.send("screen-close")
            break
        }
    }
})

// Defines the position of the first click.
let firstClick = null

// This is the element for the selection.
const element = document.getElementById("selection")

// Handles when the mouse is down.
document.body.onmousedown = async e => {
    if (e.target.matches(".clickable-property")) {
        return
    }

    firstClick = require("electron").screen.getCursorScreenPoint()
    firstClick.pageX = e.pageX
    firstClick.pageY = e.pageY
}

// Checks if a number is between other numbers. NUMBERRRRRRS!
function between(x, min, max) {
    return x >= min && x <= max
}

// Gets the inbetween windows.
const getInbetweenWindows = electronMouse => {
    const inThese = []

    for (const x of displayInfo.activeWindows) {
        if (between(electronMouse.x, x.x, x.x + x.width) && between(electronMouse.y, x.y, x.y + x.height)) {
            inThese.push(x)
        }
    }

    inThese.sort((a, b) => a.width - b.width)

    return inThese
}

// Called when the mouse moves.
document.body.onmousemove = e => {
    const thisClick = require("electron").screen.getCursorScreenPoint()
    ipcRenderer.send(`${displayInfo.uuid}-event-send`, {
        type: "invalidate-selections",
    })

    if (firstClick) {
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
        element.style.left = `${screenPart.x - displayInfo.bounds.x}px`
        element.style.top = `${screenPart.y - displayInfo.bounds.y}px`
    }
}

// Protects against XSS.
const xssProtect = data => {
    const lt = /</g
    const gt = />/g
    const ap = /'/g
    const ic = /"/g

    return data.replace(lt, "&lt;").replace(gt, "&gt;").replace(ap, "&#39;")
        .replace(ic, "&#34;")
}

// Called when the mouse button goes up.
document.body.onmouseup = async e => {
    const thisClick = require("electron").screen.getCursorScreenPoint()

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
    start.x = start.pageX + displayInfo.bounds.x
    start.y = start.pageY + displayInfo.bounds.y

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
            display: screenNumber,
            selections: selections,
            width: width,
            height: height,
        })
    } else {
        const selection = {
            display: screenNumber,
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
        ipcRenderer.send(`${displayInfo.uuid}-event-send`, {
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
        selectionBlackness.innerHTML = `
            <h1 class="selection-text">
                ${xssProtect(selectionType)}
            </h1>
        `
        document.body.appendChild(selectionBlackness)
    }
}

// Defines the uploader properties HTML element.
const uploaderProperties = document.getElementById("UploaderProperties")

// This is called when a button is invoked.
function invokeButton(buttonId) {
    const newNodes = []
    for (const el of uploaderProperties.childNodes) {
        if (el.nodeName === "A") {
            newNodes.push(el)
        }
    }

    const htmlElement = newNodes[buttonId]
    const button = displayInfo.buttons[buttonId]
    switch (button.type) {
        case "selection": {
            htmlElement.childNodes[1].classList.add("selected")
            for (const thisButtonId in displayInfo.buttons) {
                if (buttonId != thisButtonId) {
                    const thisButton = displayInfo.buttons[thisButtonId]
                    if (thisButton.type === "selection") {
                        newNodes[thisButtonId].childNodes[1].classList.remove("selected")
                    }
                }
            }
            selectionType = button.name
            ipcRenderer.send(`${displayInfo.uuid}-event-send`, {
                type: "selection-type-change",
                args: {
                    selectionType: selectionType,
                },
            })
            break
        }
    }
}

// Sets the display information.
ipcRenderer.send(`screen-${screenNumber}-load`)
ipcRenderer.once("load-reply", (_, info) => {
    displayInfo = info

    // Sets the background image.
    document.body.style.backgroundImage = `url("file://${__dirname}/dimmer.svg"), url("http://127.0.0.1:${displayInfo.port}/?key=${displayInfo.key}&display=${screenNumber}")`

    // Handles displaying the buttons.
    if (displayInfo.buttons && displayInfo.mainDisplay) {
        let propertyStr = ""
        for (const buttonId in displayInfo.buttons) {
            const button = displayInfo.buttons[buttonId]
            propertyStr += `
                <a href="javascript:invokeButton(${buttonId})" style="cursor: default;">
                    <img class="clickable-property${button.active ? " selected" : ""}" src="file://${button.imageLocation}">
                </a>
            `
        }
        uploaderProperties.innerHTML += propertyStr
    }
})

// Called when a event is recieved from another screen.
ipcRenderer.on("event-recv", (_, res) => {
    if (res.display == screenNumber) {
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
            break
        }
        case "selection-made": {
            if (selections[res.args.selectionType]) {
                selections[res.args.selectionType].push(res.args)
            } else {
                selections[res.args.selectionType] = [res.args]
            }
        }
    }
})
