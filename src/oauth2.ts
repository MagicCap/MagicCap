// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Requires stuff.
import { BrowserWindow } from "electron"
import * as express from "express"

// Defines the promise.
let unresolvedPromise

// Defines the browser window.
let browserWindow

// Handles OAuth2 logins.
export = async(initUrl: string): Promise<Object> => {
    if (browserWindow) {
        browserWindow.show()
        return null
    }
    browserWindow = new BrowserWindow({
        width: 800,
        height: 600,
        title: "MagicCap OAuth2 Authentication",
        webPreferences: {
            nodeIntegration: false,
            webSecurity: true,
        },
    })
    browserWindow.loadURL(initUrl)
    const onePromise = new Promise(res => {
        unresolvedPromise = res
    })
    const twoPromise = new Promise(res => {
        browserWindow.on("close", () => {
            if (unresolvedPromise) {
                browserWindow = null
                unresolvedPromise = null
                res(null)
            }
        })
    })
    const res = await Promise.race([onePromise, twoPromise])
    if (res) {
        unresolvedPromise = null
        browserWindow = null
    }
    return res
}

// Defines the express server.
const expressApp = express()

// Defines the auth route.
expressApp.get("/", (req, res) => {
    if (!unresolvedPromise) {
        res.send("No active login request.")
    } else {
        res.send("Request passed through.")
        unresolvedPromise(req)
        unresolvedPromise = null
        browserWindow.close()
    }
})

// Listens to the server.
expressApp.listen(61222)
