// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

import { post } from "chainfetch"
import { ConfigHandler } from "../config"

export default {
    name: "freethewump.us",
    icon: `${__dirname}/../icons/ftw.png`,
    configOptions: {
        Token: {
            value: "ftw_token",
            type: "password",
            required: true,
        },
    },
    upload: async(config: ConfigHandler, buffer: Buffer, fileType: string) => {
        const res = await post("https://freethewump.us")
            .set("Token", config.o.ftw_token)
            .attach("file", buffer, `file.${fileType}`)
        return res.body.url
    },
}
