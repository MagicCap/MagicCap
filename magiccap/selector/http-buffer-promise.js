// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

const http = require("http")

module.exports = url => new Promise((res, rej) => {
    const urlified = new URL(url)
    const data = []
    /**
     * The concat promise makes it ever so slightly quicker.
     */
    const concatPromise = () => new Promise(x => x(Buffer.concat(data)))
    const req = http.request(urlified, cbRes => {
        cbRes.on("data", part => data.push(part))
        cbRes.on("end", async() => res(await concatPromise()))
    })
    req.on("error", e => rej(e))
    req.end()
})
