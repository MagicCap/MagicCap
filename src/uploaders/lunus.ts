// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

import { post } from "chainfetch"
import * as i18n from "../i18n"
import { app } from "electron"
import { ConfigHandler } from "../config"

export default {
    name: "Lunus",
    icon: "lunus.png",
    config_options: {
        "API Token": {
            value: "novus_token",
            type: "text",
            required: true,
        },
    },
    upload: async(config: ConfigHandler, buffer: Buffer, fileType: string) => {
        let res = await post("https://lunus.xyz/api/upload")
            .set("Authorization", `Bearer ${config.o.novus_token}`)
            .set("User-Agent", `MagicCap ${app.getVersion()}; ${config.o.install_id}`)
            .attach("file", buffer, `oof.${fileType}`)
        switch (res.status) {
            case 200: break
            case 403: {
                throw new Error("Your key is invalid.")
            }
            case 429: {
                throw new Error("You have been ratelimited!")
            }
            default: {
                if (res.status >= 500 && res.status <= 599) {
                    throw new Error("There are currently server issues.")
                }
                const i18nEdgecase = await i18n.getPoPhrase("Server returned the status {status}.", "uploaders/exceptions")
                throw new Error(i18nEdgecase.replace("{status}", `${res.status}`))
            }
        }
        return res.body.url
    },
}
