// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

import { post } from "chainfetch"
import { google } from "googleapis"
// @ts-ignore
import * as streamifier from "streamifier"
import * as mime from "mime-types"
import { Request } from "express"
import { ConfigHandler } from "../config"

export default {
    name: "Google Drive",
    icon: "gdrive.png",
    config_options: {
        "Client ID": {
            value: "gdrive_client_id",
            type: "text",
            required: true,
        },
        "Client Secret": {
            value: "gdrive_client_secret",
            type: "text",
            required: true,
        },
        Token: {
            value: "gdrive_token",
            type: "oauth2",
            required: true,
        },
    },
    getOAuthUrl: (config: ConfigHandler) => `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.o.gdrive_client_id}&redirect_uri=http%3A%2F%2F127.0.0.1%3A61222&access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive&response_type=code`,
    handleOAuthFlow: async(config: ConfigHandler, req: Request) => {
        if (!req.query.code) {
            return
        }
        const urlEncode = `?client_id=${config.o.gdrive_client_id}&client_secret=${config.o.gdrive_client_secret}&redirect_uri=http%3A%2F%2F127.0.0.1%3A61222&code=${req.query.code}&grant_type=authorization_code`
        let response
        try {
            response = await post(`https://www.googleapis.com/oauth2/v4/token${urlEncode}`).set("Content-Type", "application/x-www-form-urlencoded").toJSON()
        } catch (_) {
            return
        }

        return {
            gdrive_token: response.body.access_token,
            gdrive_expires_at: Math.floor((new Date() as unknown) as number / 1000) + response.body.expires_in,
            gdrive_refresh_token: response.body.refresh_token,
        }
    },
    upload: async(config: ConfigHandler, buffer: Buffer, filetype: string, filename: string) => {
        const dateNumber = (new Date() as unknown) as number
        if (Math.floor(dateNumber / 1000) > config.o.gdrive_expires_at) {
            // We need to renew the access token.
            const urlEncode = `?client_id=${config.o.gdrive_client_id}&client_secret=${config.o.gdrive_client_secret}&refresh_token=${config.o.gdrive_refresh_token}&grant_type=refresh_token`
            const response = await post(`https://www.googleapis.com/oauth2/v4/token${urlEncode}`).set("Content-Type", "application/x-www-form-urlencoded").toJSON()
            config.o.gdrive_token = response.body.access_token
            config.o.gdrive_expires_at = Math.floor(dateNumber / 1000) + response.body.expires_in
            config.save()
        }

        const oauth = new google.auth.OAuth2()
        oauth.setCredentials({
            access_token: config.o.gdrive_token,
        })
        const drive = google.drive({
            version: "v3",
            auth: oauth,
        })
        const mimeType = mime.lookup(filetype)
        const driveResponse = await drive.files.create({
            // @ts-ignore
            requestBody: {
                name: filename,
                mimeType: mimeType,
            },
            media: {
                mimeType: mimeType,
                body: streamifier.createReadStream(buffer),
            },
        })
        const driveId = driveResponse.data.id
        // @ts-ignore
        await drive.permissions.create({
            // @ts-ignore
            fileId: driveId,
            resource: {
                role: "reader",
                type: "anyone",
            },
            fields: "id",
        })

        return `https://drive.google.com/file/d/${driveId}/view?usp=sharing`
    },
}
