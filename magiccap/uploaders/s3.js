// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

const AWS = require("aws-sdk");

module.exports = {
	name: "S3",
	icon: "s3.png",
	config_options: {
		"Access Key ID": {
			value: "s3_access_key_id",
			type: "text",
			required: true,
		},
		"Secret Access Key": {
			value: "s3_secret_access_key",
			type: "text",
			required: true,
		},
		Region: {
			value: "s3_region",
			type: "text",
			required: true,
		},
		"Bucket Name": {
			value: "s3_bucket_name",
			type: "text",
			required: true,
		},
		"Bucket URL": {
			value: "s3_bucket_url",
			type: "text",
			required: true,
		},
	},
	upload: async(buffer, filename) => {
		AWS.config.update({
			accessKeyId: config.s3_access_key_id,
			secretAccessKey: config.s3_secret_access_key,
			region: config.s3_region,
		});
		const s3 = new AWS.S3({
			apiVersion: "2006-03-01",
			params: { Bucket: config.s3_bucket_name },
		});
		await s3.upload({
			Key: filename,
			Body: buffer,
			ACL: "public-read",
		}, error => {
			throw new Error(`Could not upload: ${error}`);
		});
		let url = config.s3_bucket_url;
		if (!url.endsWith("/")) {
			url += "/";
		}
		return `${url}${filename}`;
	},
};
