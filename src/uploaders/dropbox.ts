// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// This requires Chainfetch.
import { post } from "chainfetch"
import { Request } from "express"
import { ConfigHandler } from "../config"

export default {
    name: "Dropbox",
    icon: `${__dirname}/../icons/dropbox.png`,
    configOptions: {
        "Client ID": {
            value: "dropbox_client_id",
            type: "text",
            required: true,
        },
        "Client Secret": {
            value: "dropbox_client_secret",
            type: "text",
            required: true,
        },
        "Dropbox Path": {
            value: "dropbox_path",
            type: "text",
            required: true,
            default: "/",
        },
        "Link Password (Requires Paid Dropbox)": {
            value: "dropbox_link_password",
            type: "password",
            required: false,
        },
        Token: {
            value: "dropbox_token",
            type: "oauth2",
            required: true,
        },
    },
    getOAuthUrl: (config: ConfigHandler) => `https://dropbox.com/oauth2/authorize?client_id=${config.o.dropbox_client_id}&redirect_uri=http%3A%2F%2F127.0.0.1%3A61222&response_type=code`,
    handleOAuthFlow: async(config: ConfigHandler, req: Request) => {
        if (!req.query.code) {
            return
        }
        let response
        try {
            const urlEncode = `?code=${req.query.code}&grant_type=authorization_code&client_id=${config.o.dropbox_client_id}&client_secret=${config.o.dropbox_client_secret}&redirect_uri=http%3A%2F%2F127.0.0.1%3A61222`
            response = await post(`https://api.dropboxapi.com/oauth2/token${urlEncode}`).set("Content-Type", "application/x-www-form-urlencoded").toJSON()
        } catch (_) {
            return
        }
        return {
            dropbox_token: response.body.access_token,
            dropbox_account_id: response.body.account_id,
            dropbox_uid: response.body.uid,
        }
    },
    upload: async(config: ConfigHandler, buffer: Buffer, _: string, filename: string) => {
        const dropboxPath = `${config.o.dropbox_path}${filename}`
        await post("https://content.dropboxapi.com/2/files/upload")
            .set("Authorization", `Bearer ${config.o.dropbox_token}`)
            .set("Dropbox-API-Arg", JSON.stringify({ path: dropboxPath }))
            .set("Content-Type", "application/octet-stream")
            .send(buffer)
        const dropboxSettings = {
            requested_visibility: config.o.dropbox_link_password ? "password" : "public",
            link_password: null,
        }
        if (config.o.dropbox_link_password) {
            dropboxSettings.link_password = config.o.dropbox_link_password
        }
        const urlRes = await post("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings")
            .set("Authorization", `Bearer ${config.o.dropbox_token}`)
            .set("Content-Type", "application/json")
            .send(JSON.stringify({
                path: dropboxPath,
                settings: dropboxSettings,
            }))
            .toJSON()
        return urlRes.body.url
    },
}
