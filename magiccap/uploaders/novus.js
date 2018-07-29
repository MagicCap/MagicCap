// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

const { post } = require("snekfetch");

module.exports = {
	name: "i.novus",
	icon: "novus.png",
	config_options: {
		"API Token": "novus_token",
	},
	upload: async buffer => {
		let res = await post("https://i.novuscommunity.co/api/upload")
			.set("Authorization", `Bearer ${config.novus_token}`)
			.attach("file", buffer, "oof.png");
		switch (res.statusCode) {
			case 200: break;
			case 403: {
				throw new Error("Your key is invalid");
			}
			case 429: {
				throw new Error("You have been ratelimited!");
			}
			default: {
				if (res.statusCode >= 500 <= 599) {
					throw new Error("There are currently server issues.");
				}
				throw new Error(`Server returned the status ${res.statusCode}.`);
			}
		}
		return res.body.url;
	},
};
