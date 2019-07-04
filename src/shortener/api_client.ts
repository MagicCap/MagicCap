// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Defines get from chainfetch.
import { get } from "chainfetch"

// Handles creating the shortened link. Returns null on failure.
export default async(url: string) => {
    let res
    try {
        res = await get(`https://s.magiccap.me/add?url=${encodeURIComponent(url)}`)
    } catch (_) {
        return null
    }
    if (res.status !== 200) {
        return null
    }
    return res.body
}
