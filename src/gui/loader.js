// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.
// Copyright (C) Matt Cowley (MattIPv4) <me@mattcowley.co.uk> 2019.

import { ipcRenderer, remote } from "electron"

window.onload = () => {
    document.body.style.display = "initial"
    ipcRenderer.send("window-show")
}

window.onerror = () => {
    remote.getCurrentWindow().webContents.openDevTools()
}

// Allow devtools to be opened (placing this at the top just in case something breaks whilst loading)
document.addEventListener("keydown", e => {
    // key is I, and the alt key is held down
    // and also, ctrl (for Linux) or Cmd (meta, macOS) is held down
    if (e.code == "KeyI" && e.altKey && (e.ctrlKey || e.metaKey)) {
        remote.getCurrentWindow().webContents.toggleDevTools()
    }
    // Allow Cmd+W to close the GUI on macOS
    if (e.code == "KeyW" && e.metaKey) {
        window.close()
    }
})

/**
 * Adds a stylesheet to the head of the document
 * @param {string} sheet - The link to the stylesheet to include
 */
function addStylesheet(sheet) {
    const stylesheet = document.createElement("link")
    stylesheet.setAttribute("rel", "stylesheet")
    stylesheet.setAttribute("href", sheet)
    document.head.appendChild(stylesheet)
}

// Sets the colour scheme.
addStylesheet(`./css/bulmaswatch/${window.config.o.light_theme ? "default" : "darkly"}/bulmaswatch.min.css`)
addStylesheet(`./css/main.css`)
addStylesheet(`./css/${window.config.o.light_theme ? "light" : "dark"}.css`)
