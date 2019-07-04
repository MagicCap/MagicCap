// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

import { exec } from "child_process"

/**
 * Gets the dark theme information.
 */
export default (): Promise<boolean> => new Promise(res => {
    switch (process.platform) {
        case "darwin": {
            exec("defaults read -g AppleInterfaceStyle", (err, stdout) => {
                if (err) {
                    res(false)
                } else if (stdout) {
                    res(stdout === "Dark\n")
                } else {
                    res(true)
                }
            })
            break
        }
        default: {
            res(true)
        }
    }
})
