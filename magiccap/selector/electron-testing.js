// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2019.

const { app } = require("electron")
const multiDisplayBrowserWindow = require(".")

app.on("ready", async() => {
    try {
        console.log(await multiDisplayBrowserWindow())
    } catch (e) {
        console.log(e)
    }
})
