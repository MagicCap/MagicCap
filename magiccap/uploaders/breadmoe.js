// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

const { post } = require("chainfetch");

module.exports = {
	name: "bread.moe",
	icon: "bread.png",
	config_options: {
		Key: {
			value: "bread_key",
			type: "text",
			required: true,
		},
		Domain: {
			value: "bread_domain",
			type: "text",
			required: true,
		},
	},
	upload: async buffer => {
		let res = await post("https://api-allowed.bread.moe/api/v1/upload")
			.attach("domain", config.bread_domain)
			.set("Authorization", `Bearer ${config.bread_key}`)
			.attach("file", buffer, "oof.png");
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
				throw new Error(`Server returned the status ${res.status}.`);
			}
		}
		return res.body.url;
	},
};
