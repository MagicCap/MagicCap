// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

const magicImports = require("magicimports")
const { post } = magicImports("chainfetch")
const i18n = require("../i18n")

module.exports = {
    name: "imgur",
    icon: "imgur.png",
    config_options: {},
    upload: async(buffer, fileType) => {
        let res = await post("https://api.imgur.com/3/image")
            .set("Authorization", "Client-ID 5a085a33c43d27c")
            .attach("image", buffer, `oof.${fileType}`)
        switch (res.status) {
            case 200: break
            case 403: {
                throw new Error("Your client ID is invalid.")
            }
            case 429: {
                throw new Error("You have been ratelimited!")
            }
            default: {
                if (res.status >= 500 <= 599) {
                    throw new Error("There are currently server issues.")
                }
                const i18nEdgecase = await i18n.getPoPhrase("Server returned the status {status}.", "uploaders/exceptions")
                throw new Error(i18nEdgecase.replace("{status}", `${res.status}`))
            }
        }
        return res.body.data.link
    },
}
