package core

import (
	"os"
	"path"
	"time"

	"github.com/gobuffalo/packr"
)

var (
	// HomeDir defines the home directory.
	HomeDir, _ = os.UserHomeDir()

	// ConfigPath defines the MagicCap folder path.
	ConfigPath = path.Join(HomeDir, ".magiccap")

	// Assets contains all of the data from "assets" when compiled.
	Assets = packr.NewBox("../assets")
)

// Start is the main entrypoint for the application.
func Start() {
	// Ensures that ConfigPath exists.
	_ = os.MkdirAll(ConfigPath, 0777)

	// Does any migrations which are needed.
	MigrateFrom2()

	// Boot message.
	println("MagicCap 3.0 - Copyright (C) MagicCap Development Team 2018-2019.")

	// Loads up the uploader kernel.
	LoadUploadersKernel()

	// Loads the SQLite3 DB.
	LoadDatabase()

	// Starts the tray.
	RestartTrayProcess()

	// Keep the app alive.
	for {
		time.Sleep(time.Second)
	}
	// TODO: Make a install ID.
}
