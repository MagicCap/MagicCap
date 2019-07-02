// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Imports go here.
import * as i18n from "./i18n"

/**
 * Parses the *.mconf file.
 * @param {Object} data - The JSON parsed data.
 * @returns - All the configuration items that are being changed.
 */
async function parse(data: {
    version: number,
    config_items: undefined | object,
}) {
    const version = data["version"] as Number
    if (version !== 1) {
        const wrongVerErr = await i18n.getPoPhrase("This version of MagicCap cannot read the config file given.", "mconf")
        throw new Error(wrongVerErr)
    }
    if (data["config_items"] === undefined || typeof data["config_items"] !== "object") {
        const cantParseErr = await i18n.getPoPhrase("MagicCap couldn't parse the config file.", "mconf")
        throw new Error(cantParseErr)
    }
    return data["config_items"]
}


/**
 * Gets the values of a object.
 *
 * @param {any} item - The item you want values from.
 * @returns The values.
 */
function values(item: any) {
    const x: Array<any> = []
    for (const i  in item) {
        const y = item[i] as any
        x.push(y)
    }
    return x
}

// Declares the config and imported uploaders.
declare const importedUploaders: object
declare const config: any

/**
 * Handles making a new *.mconf's file contents.
 * @returns The parsed mconf file.
 */
function new_() {
    const options: any = {}
    for (const uploader of values(importedUploaders)) {
        for (const option of values(uploader.config_options)) {
            if (config[option.value] !== undefined) {
                options[option.value] = config[option.value]
            }
        }
    }
    return {
        version: 1,
        config_items: options,
    }
}

// Things that are exported.
export default {
    new: new_,
    parse: parse,
}
