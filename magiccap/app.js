// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2018.
// Copyright (C) Rhys O'Kane <SunburntRock89@gmail.com> 2018.

const config = global.config = require(`${process.env.HOME}/magiccap.json`);
const capture = require("./capture.js");
const { app, Tray, Menu } = require("electron");

function initialiseScript() {
    const tray = new Tray("./icons/taskbar.png");
    const contextMenu = Menu.buildFromTemplate([
		  {label: "Exit", type: normal, role: "quit"}
    ]);
    tray.setContextMenu(contextMenu);
}
// Initialises the script.

app.on("ready", initialiseScript);
// The app is ready to rock!
