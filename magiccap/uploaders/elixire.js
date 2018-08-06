// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

const { post } = require("chainfetch");

module.exports = {
	name: "elixi.re",
	icon: "elixire.png",
	config_options: {
		"API Token": {
			value: "elixire_token",
			type: "text",
			required: true,
		},
	},
	upload: async buffer => {
		let res = await post("https://elixi.re/api/upload")
			.set("Authorization", config.elixire_token)
			.attach("f", buffer, "oof.png");
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
