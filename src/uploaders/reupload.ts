// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

import { post } from "chainfetch"
import * as i18n from "../i18n"
import { app } from "electron"
import { ConfigHandler } from "../config"

export default {
    name: "ReUpload.gg",
    icon: "reupload.png",
    config_options: {
        Token: {
            value: "reupload_token",
            type: "text",
            required: false,
        },
    },
    upload: async(config: ConfigHandler, buffer: Buffer, fileType: string) => {
        switch (fileType) {
            case "png":
            case "jpg":
            case "jpeg":
            case "gif":
            case "bmp": {
                const res = await post("https://reupload.gg/v1/upload/image")
                    .set("Authorization", `Bearer ${config.o.reupload_token}`)
                    .set("User-Agent", `MagicCap ${app.getVersion()}; ${config.o.install_id}`)
                    .attach("file", buffer, `oof.${fileType}`)
                return res.body.url
            }
            default: {
                throw new Error(await i18n.getPoPhrase("Invalid format for this uploader.", "uploaders/exceptions"))
            }
        }
    },
}
