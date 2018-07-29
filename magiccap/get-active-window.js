// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.

const { execAsync } = require("async-child-process");

module.exports = {
	get: async() => {
		let command;
		switch (process.platform) {
			case "darwin": {
				command = "sh ./active-window-mac.sh";
				break;
			}
			case "linux": {
				command = "sh ./active-window-linux.sh";
				break;
			}
			case "win32": {
				command = "powershell ./active-window-win.ps1";
				break;
			}
			default: {
				throw new Error(
					"Platform not supported for screen capture."
				);
			}
		}
		const { stdout } = await execAsync(command);
		return stdout.trim();
	},
};
