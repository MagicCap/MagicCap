// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

import { post } from "chainfetch"
import * as i18n from "../i18n"
import { ConfigHandler } from "../config"

export default {
    name: "elixi.re",
    icon: "elixire.png",
    config_options: {
        "API Token": {
            value: "elixire_token",
            type: "text",
            required: true,
        },
    },
    upload: async(config: ConfigHandler, buffer: Buffer, fileType: string) => {
        let res = await post("https://elixi.re/api/upload")
            .set("Authorization", config.o.elixire_token)
            .attach("f", buffer, `oof.${fileType}`)
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
