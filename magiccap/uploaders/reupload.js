// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

const magicImports = require("magicimports")
const { put } = magicImports("chainfetch")
const i18n = require("../i18n")
const { app } = magicImports("electron")

module.exports = {
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
    upload: async(buffer, fileType) => {
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
