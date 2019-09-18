// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.
// Copyright (C) Leo Nesfield <leo@thelmgn.com> 2019.

import { post } from "chainfetch"
import { ConfigHandler } from "../config"

export default {
    name: "UltraShare",
    icon: `${__dirname}/../icons/ultrashare.svg`,
    configOptions: {
        Domain: {
            value: "ultra_domain",
            type: "text",
            required: true,
        },
        "Use HTTPS": {
            value: "ultra_https",
            type: "boolean",
            required: true,
        },
        "API Key": {
            value: "ultra_key",
            type: "text",
            required: true,
        },
    },
    upload: async(config: ConfigHandler, buffer: Buffer, fileType: string) => {
        try {
            let res
            res = await post(config.o.ultra_https ? "https://" : `http://${config.o.ultra_domain}/api/upload`)
                .set("Authorization", config.o.ultra_key)
                .set("fileext", fileType)
                .set("User-Agent", "MagicCapUltraShare/1.0")
                .send(buffer)
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
                    throw new Error(`Server returned the status ${res.status}.`)
                }
            }
            return res.body.url
        } catch (e) {
            console.error(e)
            throw e
        }
    },
}
