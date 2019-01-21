// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Gets the language pack information.
const langPackInfo = require("./lang_packs.json");
const { readFile } = require("fs-nextra");
const PO = require("pofile");

// Used to cache/get *.po files.
const poCache = {};
const getPoFile = async file => {
	const cachedPo = poCache[file];
	if (cachedPo !== undefined) {
		return cachedPo;
	}

	const fp = `./i18n/${config.language || "en"}/${file}.po`;
	const _file = await readFile(fp);
	const data = PO.parse(_file.toString());

	poCache[file] = data;
	return data;
};

// Used to get a translated phrase from the file specified.
const getPoPhrase = async(phrase, file) => {
	let poFile;
	try {
		poFile = await getPoFile(file);
	} catch (_) {
		console.error(`Could not read/parse the PO file: ${file}`);
		return phrase;
	}

	for (const poItem of poFile.items) {
		if (poItem.msgid === phrase) {
			if (poItem.msgstr[0] !== "") {
				return poItem.msgstr[0];
			} else {
				return phrase;
			}
		}
	}

	return phrase;
};

// This is used to parse the HTML that needs translating.
const htmlParseRegex = /\$.+\$/g;
const poParseHtml = async htmlData => {
	let htmlDone = htmlData;
	const i18nThisDocumentation = await getPoPhrase("this documentation", "gui");
	for (;;) {
		const regexParse = htmlParseRegex.exec(htmlDone);
		if (regexParse === null) {
			break;
		}
		const parseWithoutDollars = regexParse[0].substring(1, regexParse[0].length - 1);
		const poParsed = await getPoPhrase(parseWithoutDollars, "gui")
								.replace(/&/g,'&amp;')
							   	.replace(/</g,'&lt;')
							   	.replace(/>/g,'&gt;')
							   	.replace(/"/g, '&quot;')
							   	.replace("{license}", '<a href="javascript:openMPL()">MPL-2.0</a>')
							   	.replace("{acceleratorDocs}", `<a href="javascript:openAcceleratorDocs()">${i18nThisDocumentation}</a>`);
		htmlDone = htmlDone.replace(regexParse[0], poParsed);
	}
	return htmlDone;
};

// Exports all the things.
module.exports = {
	getPoPhrase: getPoPhrase,
	langPackInfo: langPackInfo,
	poParseHtml: poParseHtml,
};
