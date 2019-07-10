// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Requires stuff.
import { BrowserWindow } from "electron"
import expressApp from "./web_server"
import * as express from "express"

// Defines the promise.
let unresolvedPromise: undefined | ((arg: null | express.Request) => void)

// Defines the browser window.
let browserWindow: BrowserWindow | undefined

// Handles OAuth2 logins.
export default async(initUrl: string): Promise<any> => {
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
        browserWindow!.on("close", () => {
            if (unresolvedPromise) {
                browserWindow = undefined
                unresolvedPromise = undefined
                res(null)
            }
        })
    })
    const res = await Promise.race([onePromise, twoPromise])
    if (res) {
        unresolvedPromise = undefined
        browserWindow = undefined
    }
    return res
}

// Defines the auth route.
expressApp.get("/", (req, res) => {
    if (!unresolvedPromise) {
        res.send("No active login request.")
    } else {
        res.send("Request passed through.")
        unresolvedPromise(req)
        unresolvedPromise = undefined
        browserWindow!.close()
    }
})
