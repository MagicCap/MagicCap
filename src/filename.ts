// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018-2019.
// Copyright (C) Matt Cowley (MattIPv4) <me@mattcowley.co.uk> 2019.

import * as moment from "moment"
const emojis = Object.values(require("emojilib").lib).map((x: any) => x.char as string)

// Declares the config.
declare const config: any

export default class Filename {
    /**
     * Used internally to generate a random character.
     * @returns {String} - The random character.
     */
    static _getRandomString(): string {
        const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        return charset.charAt(Math.floor(Math.random() * charset.length))
    }

    /**
     * Used internally to generate a random emoji.
     * @returns {String} - The random emoji.
     */
    static _getRandomEmoji(): string {
        return emojis[Math.floor(Math.random() * emojis.length)]
    }

    /**
     * Replaces patterns using callbacks.
     * @param {String} string - The original string.
     * @param {String} pattern - The pattern to use for splitting the string.
     * @param {Function} called - The function to call.
     * @returns {String} - The modified string.
     */
    static _replacePatternCallback(string: string, pattern: string, called: Function): string {
        if (string.includes(pattern)) {
            let finalString = ""
            const stringSplit = string.split(new RegExp(`(${pattern})`))
            for (const part in stringSplit) {
                if (stringSplit[part] === pattern) {
                    finalString += called()
                } else {
                    finalString += stringSplit[part]
                }
            }
            return finalString
        }
        return string
    }

    /**
     * Gets a new filename based on the user configured pattern.
     * @returns {String} - The filename.
     */
    static newFilename(): string {
        // Get pattern
        let filename = "screenshot_%date%_%time%"
        if (config.file_naming_pattern) {
            filename = config.file_naming_pattern
        }

        // Sub in fixed patterns
        filename = filename.replace(/%date%/g, moment().format("DD-MM-YYYY"))
        filename = filename.replace(/%time%/g, moment().format("HH-mm-ss"))

        // Sub in dynamic patterns
        filename = this._replacePatternCallback(filename, '"', this._getRandomString)
        filename = this._replacePatternCallback(filename, "%emoji%", this._getRandomEmoji)

        return filename
    }
}
