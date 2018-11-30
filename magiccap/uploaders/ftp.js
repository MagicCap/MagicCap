// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

const { post } = require("chainfetch");

module.exports = {
	name: "FTP",
	icon: "FTP.png",
	config_options: {
		Hostname: {
			value: "ftp_hostname",
			type: "text",
			required: true,
		},
		Port: {
			value: "ftp_port",
			type: "integer",
			default: 21,
			required: true,
		},
		Username: {
			value: "ftp_username",
			type: "text",
			required: true,
		},
		Password: {
			value: "ftp_password",
			type: "password",
			required: true,
		},
		Directory: {
			value: "ftp_directory",
			type: "text",
			default: "/",
			required: true,
		},
		Domain: {
			value: "ftp_domain",
			type: "text",
			required: true,
		},
	},
	upload: async(buffer, _, filename) => {
		const client = new (require("promise-ftp"));

		try {
			await client.connect({
				host: config.ftp_hostname,
				port: config.ftp_port,
				user: config.ftp_username,
				password: config.ftp_password,
			});
			await client.put(buffer, config.ftp_directory.endsWith("/") ? `${config.ftp_directory}${filename}` : `${config.ftp_directory}/${filename}`);
		} catch (err) {
			throw new Error(`Could not upload to FTP: ${err}`);
		}
		await client.end();

		return `${config.ftp_domain}/${filename}`;
	},
};
