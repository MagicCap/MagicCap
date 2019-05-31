// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

const magicImports = require("magicimports")
const { post } = magicImports("chainfetch")
const i18n = require("../i18n")

module.exports = {
    name: "Pomf",
    icon: "pomf.png",
    config_options: {
        Domain: {
            value: "pomf_domain",
            type: "text",
            required: true,
        },
        Token: {
            value: "pomf_token",
            type: "text",
            required: false,
        },
    },
    upload: async(buffer, fileType) => {
        let res
        if (config.pomf_token) {
            res = await post(config.pomf_domain)
                .set("token", `${config.pomf_token}`)
                .attach("files[]", buffer, `pomf.${fileType}`)
        } else {
            res = await post(config.pomf_domain)
                .attach("files[]", buffer, `pomf.${fileType}`)
        }
        switch (res.status) {
            case 200: break
            case 403: {
                throw new Error("Your key is invalid.")
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
        return res.body.files[0].url
    },
}
