// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018-2019.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

const $ = require("jquery/dist/jquery.slim");
const { ipcRenderer, remote, shell } = require("electron");
let config = require(`${require("os").homedir()}/magiccap.json`);
// The needed imports.

if (config.light_theme) {
    $("head").append(`<link rel="stylesheet" type="text/css" href="../node_modules/bulmaswatch/default/bulmaswatch.min.css">`);
    $("#sidebar").css("background-color", "#e6e6e6");
} else {
    $("head").append(`<link rel="stylesheet" type="text/css" href="../node_modules/bulmaswatch/darkly/bulmaswatch.min.css">`);
    $("#sidebar").css("background-color", "#171819");
}
// Changes the colour scheme.

let db = remote.getGlobal("captureDatabase");
// Defines the DB.

let displayedCaptures = [];
// A list of the displayed captures.

async function getCaptures() {
    displayedCaptures.length = 0;
    await db.each("SELECT * FROM captures ORDER BY timestamp DESC LIMIT 20", (err, row) => {
        if (err) { console.log(err); }
        displayedCaptures.push(row);
    });
};
getCaptures();
// Handles each capture.

new Vue({
    el: "#mainTableBody",
    data: {
        captures: displayedCaptures,
        successMap: {
            0: "Failure",
            1: "Success",
        },
    },
    methods: {
        rmCapture: async timestamp => {
            await db.run(
                "DELETE FROM captures WHERE timestamp = ?",
                [timestamp],
            );
            await getCaptures();
        },
        openScreenshotURL: async url => {
            await shell.openExternal(url);
        },
        openScreenshotFile: async filePath => {
            await shell.openItem(filePath);
        },
    },
});
// Handles the upload list.

ipcRenderer.on("screenshot-upload", async () => {
    await getCaptures();
});
// Handles new screenshots.

window.onload = async() => {
	await $("body").show();
	ipcRenderer.send("window-show");
};
// Unhides the body/window when the page has loaded.
