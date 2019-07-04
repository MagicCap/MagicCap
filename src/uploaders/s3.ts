// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

import { S3 } from "tiny-s3-uploader"
import * as mime from "mime-types"
import { ConfigHandler } from "../config"

export default {
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
    upload: async(config: ConfigHandler, buffer: Buffer, ext: string, filename: string) => {
        if (config.o.s3_endpoint.startsWith("http://")) {
            config.o.s3_endpoint = config.o.s3_endpoint.trimStart("http://")
        } else if (config.o.s3_endpoint.startsWith("https://")) {
            config.o.s3_endpoint = config.o.s3_endpoint.trimStart("https://")
        }
        const s3 = new S3(config.o.s3_endpoint, config.o.s3_access_key_id.trim(), config.o.s3_secret_access_key.trim(), config.o.s3_bucket_name)
        await s3.upload(
            filename, "public-read", mime.lookup(ext) || "application/octet-stream", buffer,
        )
        let url = config.o.s3_bucket_url
        if (!url.endsWith("/")) {
            url += "/"
        }
        if (!(url.startsWith("http://") || url.startsWith("https://"))) {
            url = `https://${url}`
        }
        return `${url}${filename}`
    },
}
