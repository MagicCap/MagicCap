// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019-2020.

package core

import (
	"fmt"
	"math/rand"
	"os"
	"path"
	"time"

	"github.com/faiface/mainthread"
	"github.com/go-gl/gl/v3.3-core/gl"
	"github.com/go-gl/glfw/v3.3/glfw"
	"github.com/kbinani/screenshot"

	"github.com/hackebrot/turtle"

	"github.com/getsentry/sentry-go"
	"github.com/gobuffalo/packr"
	platformspecific "github.com/magiccap/MagicCap/core/platform_specific"
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

	// Load in all of the emojis.
	for _, value := range turtle.Emojis {
		Emojis = append(Emojis, value.String())
	}

	// Gets the start time.
	StartTime := time.Now()

	// Initialises Sentry.
	err := sentry.Init(sentry.ClientOptions{
		Dsn: "https://9eafc18531ea47dcb497d21ab45f80d4@sentry.io/1865806",
	})
	if err != nil {
		panic(err)
	}

	// Ensures that ConfigPath exists.
	_ = os.MkdirAll(ConfigPath, 0777)

	// Does any migrations which are needed.
	MigrateFrom2()

	// Boot message.
	println("MagicCap " + Version + " - Copyright (C) MagicCap Development Team 2018-2020.")

	// Catch any errors during initialisation and log them to Sentry.
	defer func() {
		if err := recover(); err != nil {
			sentry.CaptureException(err.(error))
			panic(err)
		}
	}()

	// Loads up the uploader kernel.
	LoadUploadersKernel()

	// Loads the SQLite3 DB.
	LoadDatabase()
	// Ensures there is a install ID.
	EnsureInstallID()

	// Take a 1x1 screenshot to ensure that it is ok and the permissions dialog pops up.
	_, err = screenshot.Capture(1, 1, 1, 1)
	if err != nil {
		sentry.CaptureException(err)
		panic(err)
	}

	// Initialise the application loop in the main thread.
	mainthread.CallNonBlock(platformspecific.ApplicationLoopStart(func() {
		// Initialises glfw/gl.
		err := glfw.Init()
		if err != nil {
			panic(err)
		}
		err = gl.Init()
		if err != nil {
			panic(err)
		}

		// Starts the tray.
		RestartTrayProcess(true)
	}))

	// Defines how long it took.
	elapsed := time.Since(StartTime)
	fmt.Printf("Initialisation took %s.\n", elapsed)
}
