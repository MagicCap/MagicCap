// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

const { S3 } = require("tiny-s3-uploader")
const mime = require("mime-types")

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
        Endpoint: {
            value: "s3_endpoint",
            type: "text",
            required: true,
            default: "s3.eu-west-2.amazonaws.com",
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
    upload: async(buffer, ext, filename) => {
        if (config.s3_endpoint.startsWith("http://")) {
            config.s3_endpoint = config.s3_endpoint.trimStart("http://")
        } else if (config.s3_endpoint.startsWith("https://")) {
            config.s3_endpoint = config.s3_endpoint.trimStart("https://")
        }
        const s3 = new S3(config.s3_endpoint, config.s3_access_key_id.trim(), config.s3_secret_access_key.trim(), config.s3_bucket_name)
        await s3.upload(
            filename, "public-read", mime.lookup(ext), buffer,
        )
        let url = config.s3_bucket_url
        if (!url.endsWith("/")) {
            url += "/"
        }
        if (!(url.startsWith("http://") || url.startsWith("https://"))) {
            url = `https://${url}`
        }
        return `${url}${filename}`
    },
}
