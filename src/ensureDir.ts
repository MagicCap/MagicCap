// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

import { promises } from "fs"

export default async(fp: string) => {
    try {
        await promises.stat(fp)
    } catch (_) {
        await promises.mkdir(fp)
    }
}
