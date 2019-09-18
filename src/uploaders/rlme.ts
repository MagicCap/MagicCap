// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

import { post } from "chainfetch"
import { ConfigHandler } from "../config"

export default {
    name: "RATELIMITED.ME",
    icon: "rlme.png",
    configOptions: {
        Token: {
            value: "rlme_token",
            type: "password",
            required: true,
        },
        Domain: {
            value: "rlme_domain",
            type: "text",
            required: true,
            default: "ratelimited.me",
        },
    },
    upload: async(config: ConfigHandler, buffer: Buffer, fileType: string) => {
        const res = await post(`https://api.ratelimited.me/upload/pomf?key=${encodeURIComponent(config.o.rlme_token)}`)
            .attach("files[]", buffer, `pomf.${fileType}`)
        if (!res.body.success) {
            throw new Error("This returned false for the success, but still gave a 200 OK. Please tell the RATELIMITED team to fix their API. <3")
        }
        return `https://${config.o.rlme_domain}/${res.body.files[0].url}`
    },
}
