// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email 2019.

package core

import (
	"fmt"
	"github.com/kbinani/screenshot"
	"math/rand"
	"os"
	"path"
	"time"

	"github.com/faiface/mainthread"
	"github.com/hackebrot/turtle"

	"github.com/go-gl/gl/v3.3-core/gl"
	"github.com/go-gl/glfw/v3.3/glfw"
	"github.com/gobuffalo/packr"
)

var (
	// HomeDir defines the home directory.
	HomeDir, _ = os.UserHomeDir()

	// ConfigPath defines the MagicCap folder path.
	ConfigPath = path.Join(HomeDir, ".magiccap")

	// CoreAssets contains all of the data from core assets when compiled.
	CoreAssets = packr.NewBox("../assets/core")

	// Version defines the version.
	Version = "3.0.0a1"

	// Emojis are all usable emojis.
	Emojis = make([]string, 0)
)

// Start is the main entrypoint for the application.
func Start() {
	// Handle the random seed.
	rand.Seed(time.Now().UnixNano())

	// Initialises glfw/gl.
	err := mainthread.CallErr(glfw.Init)
	if err != nil {
		panic(err)
	}
	err = mainthread.CallErr(gl.Init)
	if err != nil {
		panic(err)
	}

	// Load in all of the emojis.
	for _, value := range turtle.Emojis {
		Emojis = append(Emojis, value.String())
	}

	// Gets the start time.
	StartTime := time.Now()

	// Ensures that ConfigPath exists.
	_ = os.MkdirAll(ConfigPath, 0777)

	// Does any migrations which are needed.
	MigrateFrom2()

	// Boot message.
	println("MagicCap " + Version + " - Copyright (C) MagicCap Development Team 2018-2019.")

	// Loads up the uploader kernel.
	LoadUploadersKernel()

	// Loads the SQLite3 DB.
	LoadDatabase()

	// Ensures there is a install ID.
	EnsureInstallID()

	// Starts the tray.
	RestartTrayProcess()

	// Take a 1x1 screenshot to ensure that it is ok and the permissions dialog pops up.
	_, err = screenshot.Capture(1, 1, 1, 1)
	if err != nil {
		panic(err)
	}

	// Defines how long it took.
	elapsed := time.Since(StartTime)
	fmt.Printf("Initialisation took %s.\n", elapsed)

	// Keep the app alive.
	for {
		time.Sleep(time.Second)
	}
}
