// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Imports FS and OS.
import { readFileSync } from "fs"
import { homedir } from "os"

// Exports the lite touch config.
let liteTouch: any
if (!liteTouch) {
    try {
        liteTouch = JSON.parse(readFileSync("/usr/share/magiccap_deployment_info.json").toString())
        if (liteTouch.config.save_path && liteTouch.config.save_path.startsWith("$H")) {
            liteTouch.config.save_path = liteTouch.config.save_path.replace("$H", homedir())
        }
    } catch (_) {
        // Do nothing
    }
}
export default liteTouch
