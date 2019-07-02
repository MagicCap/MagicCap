// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

import { put } from "chainfetch"
import * as i18n from "../i18n"
import { app } from "electron"

declare const config: any

export default {
    name: "reUpload",
    icon: "reupload.png",
    config_options: {
        Token: {
            value: "reupload_token",
            type: "token_from_json",
            required: true,
            startUrl: "https://api.reupload.gg/login",
            endUrlRegex: "https:\\/\\/api.reupload.gg\\/authorize.+",
        },
    },
    upload: async(buffer: Buffer, fileType: string) => {
        switch (fileType) {
            case "png":
            case "jpg":
            case "jpeg":
            case "gif":
            case "bmp": {
                const res = await put("https://api.reupload.gg/image")
                    .set("Content-Type", `image/${fileType}`)
                    .set("Authorization", config.reupload_token)
                    .set("User-Agent", `MagicCap ${app.getVersion()}; ${config.install_id}`)
                    .send(buffer)
                return res.body.url
            }
            default: {
                throw new Error(await i18n.getPoPhrase("Invalid format for this uploader.", "uploaders/exceptions"))
            }
        }
    },
}
