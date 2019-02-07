// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Imports go here.
const i18n = require(`${__dirname}/i18n`);

// Parses the *.mconf file.
const parse = async data => {
    if (data.version !== 1) {
        const wrongVerErr = await i18n.getPoPhrase("This version of MagicCap cannot read the config file given.", "mconf");
        throw new Error(wrongVerErr);
    }
    if (data.config_items === undefined || typeof(data.config_items) !== "object") {
        const cantParseErr = await i18n.getPoPhrase("MagicCap couldn't parse the config file.", "mconf");
        throw new Error(cantParseErr);
    }
    return data.config_items;
};

// Gets the values of a object.
const values = item => {
    const x = [];
    for (const i in item) {
        x.push(item[i]);
    }
    return x;
};

// Handles making a new *.mconf file.
const new_ = () => {
    const options = {};
    for (const uploader of values(importedUploaders)) {
        for (const option of values(uploader.config_options)) {
            if (config[option.value] !== undefined) {
                options[option.value] = config[option.value];
            }
        }
    }
    return options;
};

// Things that are exported.
module.exports = {
    new: new_,
    parse: parse,
};
