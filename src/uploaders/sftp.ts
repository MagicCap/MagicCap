// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

import * as i18n from "../i18n"
import * as Client from "ssh2-sftp-client"
import config from "../config"

export default {
    name: "SFTP",
    icon: "sftp.png",
    config_options: {
        Hostname: {
            value: "sftp_hostname",
            type: "text",
            required: true,
        },
        Port: {
            value: "sftp_port",
            type: "integer",
            default: 22,
            required: true,
        },
        Username: {
            value: "sftp_username",
            type: "text",
            required: true,
        },
        Password: {
            value: "sftp_password",
            type: "password",
            required: true,
        },
        Directory: {
            value: "sftp_directory",
            type: "text",
            required: true,
        },
        "Base URL": {
            value: "sftp_domain",
            type: "text",
            required: true,
        },
    },
    upload: async(buffer: Buffer, _: string, filename: string) => {
        const sftp = new Client()

        try {
            await sftp.connect({
                host: config.o.sftp_host,
                port: config.o.sftp_port,
                username: config.o.sftp_username,
                password: config.o.sftp_password,
            })
        } catch (err) {
            const SFTPErr = await i18n.getPoPhrase("Unable to login to SSH server: {err}", "uploaders/exceptions")
            throw new Error(SFTPErr.replace("{err}", `${err}`))
        }

        try {
            await sftp.put(buffer, config.o.sftp_directory)
        } catch (err) {
            const SFTPErr = await i18n.getPoPhrase("Unable to upload to SSH server: {err}", "uploaders/exceptions")
            throw new Error(SFTPErr.replace("{err}", `${err}`))
        }

        let baseURL = config.o.sftp_domain
        if (baseURL.endsWith("/") || baseURL.endsWith("\\")) {
            baseURL = baseURL.slice(0, -1)
        }

        return `${baseURL}/${filename}`
    },
}
