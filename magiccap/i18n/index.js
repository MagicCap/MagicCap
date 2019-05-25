// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Gets the language pack information.
const nativeLangNames = require("./native_lang_names.json")
const { readFile } = require("fs-nextra")
const { readdirSync, statSync } = require("fs")
const { join } = require("path")
const { config } = require("../config")
const PO = require("pofile")

const poCache = new Map()
/**
 * Used to cache/get the *.po files.
 */
const getPoFile = async file => {
    const cachedPo = poCache[file]
    if (cachedPo !== undefined) {
        return cachedPo
    }

    const fp = `${__dirname}/${config.language || "en"}/${file}.po`
    const _file = await readFile(fp)
    const data = PO.parse(_file.toString())

    poCache[file] = data
    return data
}

/**
 * Used to get a translated phrase from the file specified.
 */
const getPoPhrase = async(phrase, file) => {
    let poFile
    try {
        poFile = await getPoFile(file)
    } catch (e) {
        console.error(`Could not read/parse the PO file: ${file}\nError: ${e}`)
        return phrase
    }

    for (const poItem of poFile.items) {
        if (poItem.msgid === phrase) {
            if (poItem.msgstr[0] !== "") {
                return poItem.msgstr[0]
            } else {
                return phrase
            }
        }
    }

    return phrase
}

const htmlParseRegex = /\$.+\$/g
/**
 * Used to parse the HTML that needs translating.
 */
const poParseHtml = async htmlData => {
    let htmlDone = htmlData
    const i18nThisDocumentation = await getPoPhrase("this documentation", "gui")
    for (;;) {
        const regexParse = htmlParseRegex.exec(htmlDone)
        if (regexParse === null) {
            break
        }
        const parseWithoutDollars = regexParse[0].substring(1, regexParse[0].length - 1)
        const poParsed = (await getPoPhrase(parseWithoutDollars, "gui"))
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace("{license}", '<a href="javascript:openMPL()">MPL-2.0</a>')
            .replace("{emojiLicense}", '<a href="javascript:openEmojiLicense()">BSD 3-Clause</a>')
            .replace("{acceleratorDocs}", `<a href="javascript:openAcceleratorDocs()">${i18nThisDocumentation}</a>`)
            .replace("{patternRandStr}", '<code>"</code>')
            .replace("{patternRandEmoji}", "<code>%emoji%</code>")
            .replace("{patternDate}", "<code>%date%</code>")
            .replace("{patternTime}", "<code>%time%</code>")
        htmlDone = htmlDone.replace(regexParse[0], poParsed)
    }
    return htmlDone
}

// Handles showing all of the language packs.
const langPackInfo = new Map()
for (const file of readdirSync(`${__dirname}`)) {
    if (statSync(join(`${__dirname}`, file)).isDirectory()) {
        langPackInfo[file] = nativeLangNames[file]
    }
}

// Exports all the things.
module.exports = {
    getPoPhrase: getPoPhrase,
    langPackInfo: langPackInfo,
    poParseHtml: poParseHtml,
}
