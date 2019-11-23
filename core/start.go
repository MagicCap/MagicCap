package core

import (
	"github.com/getlantern/systray"
	"github.com/gobuffalo/packr"
	"os"
	"path"
)

var (
	// HomeDir defines the home directory.
	HomeDir, _ = os.UserHomeDir()

	// ConfigPath defines the MagicCap folder path.
	ConfigPath = path.Join(HomeDir, ".magiccap")

	// Gets the assets.
	Assets = packr.NewBox("../assets")
)

// OnReady defines the ready of the application when the tray is initialised.
func OnReady() {
	// Loads up the uploader kernel.
	LoadUploadersKernel()

	// Loads the SQLite3 DB.
	LoadDatabase()

	// TODO: Make a install ID.

	// Initialises the tray in another thread.
	go InitTray()
}

// OnExit defines the exit of the tray.
func OnExit() {
	// TODO: Cleaning stuff here.
}

func Start() {
	// Ensures that ConfigPath exists.
	_ = os.MkdirAll(ConfigPath, 0777)

	// Does any migrations which are needed.
	MigrateFrom2()

	// Boot message.
	println("MagicCap 3.0 - Copyright (C) MagicCap Development Team 2018-2019.")

	// Runs the systray.
	systray.Run(OnReady, OnExit)
}
