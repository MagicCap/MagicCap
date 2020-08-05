// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.
// Copyright (C) Matt Cowley (MattIPv4) <me@mattcowley.co.uk> 2019.

import { app } from "electron"
import { sep } from "path"
import darkThemeInformation from "./system_dark_theme"
import newInstallId from "./install_id"
import ensureDir from "./ensureDir"

/**
 * Creates the default config.
 * @returns The default config object.
 */
export default async function getDefaultConfig() {
    const picsDir = `${app.getPath("pictures")}${sep}MagicCap${sep}`
    const defaultConfig = {
        hotkey: null,
        upload_capture: true,
        uploader_type: "magiccap",
        clipboard_action: 2,
        save_capture: true,
        save_path: picsDir,
        light_theme: !await darkThemeInformation(),
        install_id: await newInstallId(),
    }
    await ensureDir(defaultConfig.save_path).catch(async(error: any) => {
        if (!(error.errno === -4075 || error.errno === -17)) {
            delete defaultConfig.save_path
        }
    })
    return defaultConfig
}
