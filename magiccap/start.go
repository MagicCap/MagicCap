package magiccap

import (
	"github.com/getlantern/systray"
	"os"
	"path"
)

var (
	// HomeDir defines the home directory.
	HomeDir, _ = os.UserHomeDir()

	// ConfigPath defines the MagicCap folder path.
	ConfigPath = path.Join(HomeDir, ".magiccap")
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
	// Boot message.
	println("MagicCap 3.0 - Copyright (C) MagicCap Development Team 2018-2019.")

	// Runs the systray.
	systray.Run(OnReady, OnExit)
}
