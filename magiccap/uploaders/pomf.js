// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

const { post } = require("chainfetch");

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
	upload: async buffer => {
		let res;
		if (config.pomf_token) {
			res = await post(config.pomf_domain)
				.set("token", `${config.pomf_token}`)
				.attach("files[]", buffer, "pomf.png");
		} else {
			res = await post(config.pomf_domain)
				.attach("files[]", buffer, "pomf.png");
		}
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
		return res.body.files[0].url;
	},
};
