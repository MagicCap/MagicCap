// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

const { post } = require("chainfetch");
const i18n = require("../i18n");

module.exports = {
	name: "i.magiccap",
	icon: "magiccap.png",
	config_options: {},
	upload: async(buffer, fileType) => {
		let res = await post("https://i.magiccap.me/upload")
			.set("Authorization", `Bearer ${config.install_id}`)
			.attach("data", buffer, `x.${fileType}`);
		switch (res.status) {
			case 200: break;
			case 403: {
				throw new Error("Your key is invalid.");
			}
			case 429: {
				throw new Error("You have been ratelimited!");
			}
			default: {
				if (res.status >= 500 <= 599) {
					throw new Error("There are currently server issues.");
				}
				const i18nEdgecase = await i18n.getPoPhrase("Server returned the status {status}.", "uploaders/exceptions");
				throw new Error(i18nEdgecase.replace("{status}", `${res.status}`));
			}
		}
		return res.body.url;
	},
};
