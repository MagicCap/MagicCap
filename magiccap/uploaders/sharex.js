// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// eslint-disable no-inline-comments

const { post } = require("chainfetch");
const { readFile } = require("fs-nextra");
const safeEval = require("safe-eval");

// Defines image extensions for parsing.
const imageExtensions = [
	"jpg", "jpeg", "png", "gif"
];

// Defines text extensions for parsing.
const textExtensions = [
	"md", "txt"
];

// Defines the ShareX parsing regex.
const shareXRegex = /(?!\\)\$[a-z]{3,5}:.+(?!\\)\$/g;

// Parses the ShareX SXCU file.
function parseShareXFile(parsedJson, fileType) {
	const parsed = {};
	const fileTypeLower = fileType.toLowerCase();
	
	if (parsedJson.DestinationType === undefined) {
		throw new Error();
	}
	const typeSplit = parsedJson.DestinationType.split(" ");
	let typeAllowed = false;
	for (uploadType of typeSplit) {
		if (typeAllowed) {
			break;
		}
		switch (uploadType) {
			case "ImageUploader": {
				if (imageExtensions.indexOf(fileTypeLower) > -1) {
					typeAllowed = true;
				}
				break;
			}
			case "TextUploader": {
				if (textExtensions.indexOf(fileTypeLower) > -1) {
					typeAllowed = true;
				}
				break;
			}
			case "FileUploader": {
				typeAllowed = true;
				break;
			}
		}
	}

	parsed.typeAllowed = typeAllowed;

	if (parsedJson.RequestURL === undefined) {
		throw new Error();
	}

	parsed.url = parsedJson.RequestURL;
	parsed.headers = parsedJson.Headers;
	
	if (parsedJson.RequestType != undefined && parsedJson.RequestType != "POST") {
		throw new Error();
	}

	if (parsedJson.URL === undefined) {
		throw new Error();
	}

	if (parsedJson.FileFormName === undefined) {
		throw new Error();
	}

	parsed.fileFormName = parsedJson.FileFormName;
	parsed.args = parsedJson.Arguments;
	parsed.regexList = parsedJson.RegexList || [];
	parsed.resultUrl = parsedJson.URL;

	return parsed;
}

// Parses the ShareX URL response.
function parseShareXResult(parsedSxcu, body) {
	const parsing = {};

	let result = parsedSxcu.resultUrl;
	for (;;) {
		const reExec = shareXRegex.exec(result);
		if (reExec === null) {
			break;
		}

		let reResult = reExec[0];
		reResult = reResult.substring(1, reResult.length - 1);

		const methodType = reResult.split(":")[0];
		const methodArg = reResult.split(":")[1];

		let res;

		switch (methodType) {
			case "json": {
				if (parsing.set) {
					if (parsing.set !== methodType) {
						throw new Error("You cannot parse the result as XML and JSON.");
					}
				} else {
					try {
						parsing.set = methodType;
						parsing.parsed = JSON.parse(body);
					} catch(_) {
						throw new Error("Unable to parse to JSON.");
					}
				}
				try {
					res = safeEval(`data.${methodArg}`, {
						data: parsing.parsed,
					});
					if (res === undefined) {
						throw new Error();
					}
				} catch(_) {
					throw new Error("Could not get the argument specified.");
				}
				break;
			}
			case "xml": {
				if (parsing.set) {
					if (parsing.set !== methodType) {
						throw new Error("You cannot parse the result as XML and JSON.");
					}
				} else {
					try {
						parsing.set = methodType;
						const parser = new DOMParser();
						parsing.parsed = parser.parseFromString(body, "text/xml");
					} catch(_) {
						throw new Error("Unable to parse to XML.");
					}
				}
				try {
					res = `${parsing.parsed.evaluate(body, parsing.parsed, null, XPathResult.ANY_TYPE).iterateNext().childNodes[0]}`
				} catch(_) {
					throw new Error("Could not get the argument specified.");
				}
				break;
			}
			case "regex": {
				const index = parseInt(methodArg);
				if (index === NaN) {
					throw new Error("Index couldn't be parsed to a integer.");
				}
				const indexRes = parsedSxcu.regexList[index - 1];
				if (indexRes === undefined) {
					throw new Error("Regex is undefined.");
				}
				const r = RegExp(indexRes).exec(body);
				if (r === null) {
					throw new Error("Regex specified not matched.");
				}
				res = r[0];
				break;
			}
			default: {
				throw new Error("Unknown ShareX parser.");
			}
		}

		const start = result.substring(0, reExec.index);
		const end = result.substring(reExec.index + reResult.length + 2, result.length);

		result = `${start}${res}${end}`;
	}

	return result;
}

module.exports = {
	name: "ShareX SXCU",
	icon: "sharex.png",
	config_options: {
		"SXCU File Path": {
			value: "sharex_sxcu_path",
			type: "text",
			required: true,
		},
	},
	upload: async(buffer, fileType, filename) => {
		const sxcuPath = config.sharex_sxcu_path;
		let openedFile;
		try {
			if (sxcuPath.startsWith("data:")) {
				openedFile = sxcuPath.substring(5);
			} else {
				openedFile = await readFile(sxcuPath);
			}
		} catch(_) {
			throw new Error("SXCU file could not be opened.");
		}

		let parsedJson, parsedSxcu;

		try {
			parsedJson = JSON.parse(openedFile);
		} catch(_) {
			throw new Error("Unable to JSON parse the SXCU file.");
		}

		try {
			parsedSxcu = parseShareXFile(parsedJson, fileType);
		} catch(_) {
			throw new Error("Unable to parse the SXCU file.");
		}

		if (!parsedSxcu.typeAllowed) {
			throw new Error("File type not allowed by this SXCU.");
		}

		const res = await post(parsedSxcu.url)
			.set(parsedSxcu.headers || {})
			.attach(parsedSxcu.args || {})
			.attach(parsedSxcu.fileFormName, buffer, filename);

		let body = res.body;
		if (typeof(res.body) !== "string") {
			body = JSON.stringify(res.body);
		}

		return parseShareXResult(parsedSxcu, body);
	},
};
