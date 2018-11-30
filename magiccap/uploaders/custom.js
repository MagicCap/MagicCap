// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

// eslint-disable no-inline-comments

const { post } = require("chainfetch");

module.exports = {
	name: "Custom",
	icon: "custom.png",
	config_options: {
		URL: {
			value: "custom_url",
			type: "text",
			required: true,
		},
		"Image Body": {
			value: "custom_image",
			type: "text",
			required: true,
		},
		"Response Key": {
			value: "custom_response",
			type: "text",
			required: false,
		},
		Headers: {
			value: "custom_headers",
			type: "object",
			required: false,
		},
		Body: {
			value: "custom_body",
			type: "object",
			required: false,
		},
	},
	upload: async(buffer, _, filename) => {
		let res = await post(config.custom_url)
			.set(config.custom_headers)
			.send(config.custom_body)
			.attach("file", buffer, filename);

		if (!config.custom_response) return res.body;
		return res.body[config.custom_response];
	},
};
