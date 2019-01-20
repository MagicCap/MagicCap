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

// Exports all the things.
module.exports = {
	getPoPhrase: getPoPhrase,
	langPackInfo: langPackInfo,
};
