// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

import * as i18n from "../i18n"
import * as promiseFtp from "promise-ftp"

declare const config: any

export default {
    name: "Passive FTP",
    icon: "ftp.png",
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
        "Base URL": {
            value: "ftp_domain",
            type: "text",
            required: true,
        },
    },
    upload: async(buffer: Buffer, _: string, filename: string) => {
        const client = new promiseFtp()

        try {
            await client.connect({
                host: config.ftp_hostname,
                port: config.ftp_port,
                user: config.ftp_username,
                password: config.ftp_password,
            })
            await client.put(buffer, config.ftp_directory.endsWith("/") ? `${config.ftp_directory}${filename}` : `${config.ftp_directory}/${filename}`)
        } catch (err) {
            const nonFTPError = await i18n.getPoPhrase("Could not upload to FTP: {err}", "uploaders/exceptions")
            throw new Error(nonFTPError.replace("{err}", `${err}`))
        }
        await client.end()

        let baseURL = config.ftp_domain
        if (baseURL.endsWith("/") || baseURL.endsWith("\\")) {
            baseURL = baseURL.slice(0, -1)
        }

        return `${baseURL}/${filename}`
    },
}
