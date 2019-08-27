// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

import app from "./web_server"
import { uploaders } from "./uploaders"
import fetch from "node-fetch"
import * as SQLite3 from "better-sqlite3"
import { homedir } from "os"
import * as express from "express"
import config from "./shared/config"
import { dialog } from "electron"

const db = SQLite3(`${homedir()}/magiccap.db`)

// The DB query for inserting/getting a token.
const tokenInsert = db.prepare("INSERT INTO tokens VALUES (?, ?, ?)")
const tokenGet = db.prepare("SELECT * FROM tokens WHERE token = ?")
const tokenDelete = db.prepare("DELETE FROM tokens WHERE token = ?")

// Handles swap tokens on the client side.
app.get("/uploaders_api/v1/auth/swap/:uploader", async(req, res) => {
    res.header("Access-Control-Allow-Origin", "*")

    const uploader = req.params.uploader
    if (!Object.keys(uploaders).includes(uploader)) {
        res.status(400)
        res.json({
            success: false,
            message: "This version of MagicCap does not support the uploader specified.",
        })
        return
    }

    const fetchRes = await fetch(`https://api.magiccap.me/swap_tokens/create/${encodeURIComponent(uploader)}`)
    const json = await fetchRes.json()
    if (!fetchRes.ok) {
        res.status(fetchRes.status)
        res.json(json)
        return
    }

    tokenInsert.run(json.client_token, json.expires, uploader)
    delete json.client_token
    res.json(json)
})

// Middleware to handle swap auth.
const authMiddleware = (req: any, res: express.Response, next: () => void) => {
    const forbidden = () => {
        res.status(403)
        res.json({
            success: false,
            message: "Forbidden.",
        })
    }

    const authorization = req.headers.authorization
    if (!authorization) return forbidden()

    const authSplit = authorization.split(/ /)
    if (authSplit.length !== 2) return forbidden()

    const bearer = authSplit[0].toLowerCase()
    if (bearer !== "bearer") return forbidden()

    const token = authSplit[1]
    const row = tokenGet.get(token)
    if (Math.floor(Date.now() / 1000) > row.expires) return forbidden()

    req.token = token
    req.uploaderSlug = row.uploader

    next()
}

// Handles token revokes.
app.get("/uploaders_api/v1/auth/revoke", [authMiddleware], (req: any, res: express.Response) => {
    res.header("Access-Control-Allow-Origin", "*")
    const token = req.token
    tokenDelete.run(token)
    res.json({
        success: true,
    })
})

// Allows for the write-only editing of uploaders.
app.get("/uploaders_api/v1/uploaders/set", [authMiddleware], (req: any, res: express.Response) => {
    res.header("Access-Control-Allow-Origin", "*")

    const uploader = (uploaders as any)[req.uploaderSlug]
    const allowedKeys = []
    for (const uploaderConfig of Object.values(uploader.config_options)) allowedKeys.push((uploaderConfig as any).value)

    const query = req.query
    for (const queryPart of Object.keys(query)) {
        if (!allowedKeys.includes(queryPart)) {
            res.status(400)
            res.json({
                success: false,
                message: "Your uploader cannot touch this in the configuration.",
            })
            return
        }
        let jsonParse
        try {
            jsonParse = JSON.parse(query[queryPart])
        } catch (_) {
            res.status(400)
            res.json({
                success: false,
                message: "Failed to JSON parse a part of your configuration.",
            })
            return
        }

        config.o[queryPart] = jsonParse
    }

    config.save()
    res.json({
        success: true,
    })
})

// Allows for a uploader to check if it is default.
app.get("/uploaders_api/v1/uploaders/default_check", [authMiddleware], (req: any, res: express.Response) => {
    res.header("Access-Control-Allow-Origin", "*")
    res.json({
        success: true,
        default: req.uploaderSlug === config.o.uploader_type,
    })
})

// Throws up an uploader prompt.
const uploaderPrompt = (uploaderSlug: string) => {
    const uploader = (uploaders as any)[uploaderSlug]
    dialog.showMessageBox({
        type: "info",
        buttons: ["Yes", "No"],
        message: `Set "${uploader.name}" as your default uploader?`,
        detail: `Do you want to set "${uploader.name}" as your default uploader? This will also enable capture uploading.`,
    }, res => {
        if (res === 0) {
            config.o.save_capture = true
            config.o.uploader_type = uploaderSlug
            config.save()
        }
    })
}

// Allows for a uploader to prompt to be default.
app.get("/uploaders_api/v1/uploaders/default_prompt", [authMiddleware], (req: any, res: express.Response) => {
    res.header("Access-Control-Allow-Origin", "*")
    res.json({
        success: true,
    })

    uploaderPrompt(req.uploaderSlug)
})
