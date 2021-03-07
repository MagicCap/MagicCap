// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019-2020.

package core

import (
	"fmt"
	coreAssets "github.com/magiccap/MagicCap/assets/core"
	"github.com/magiccap/MagicCap/core/apploop"
	"github.com/magiccap/MagicCap/core/notifications"
	regionselector "github.com/magiccap/MagicCap/core/region_selector"
	"github.com/magiccap/MagicCap/core/region_selector/renderers"
	"github.com/magiccap/MagicCap/core/singleinstance"
	"github.com/magiccap/MagicCap/core/threadsafescreenshot"
	"github.com/magiccap/MagicCap/core/updater"
	"math/rand"
	"os"
	"path"
	"time"

	"github.com/hackebrot/turtle"

	"github.com/getsentry/sentry-go"
)

var (
	// HomeDir defines the home directory.
	HomeDir, _ = os.UserHomeDir()

	// ConfigPath defines the MagicCap folder path.
	ConfigPath = path.Join(HomeDir, ".magiccap")

	// Version defines the version.
	Version = "3.0.0a1"

	// Emojis are all usable emojis.
	Emojis = make([]string, 0)
)

// Start is the main entrypoint for the application.
//export Start
func Start() {
	// Initialise the application loop in the main thread.
	apploop.ApplicationLoopStart(func() {
		// Boot message.
		println("MagicCap " + Version + " - Copyright (C) MagicCap Development Team 2018-2021.")

		// Initialises the renderer.
		renderers.RendererInit()

		// Initialise notifications.
		notifications.NotificationInit()

		// Make the MagicCap internal directory.
		_ = os.MkdirAll(ConfigPath, 0777)

		// Try acquiring the single instance lock.
		singleinstance.SingleInstance(path.Join(ConfigPath, "instance.lock"), func() {
			OpenPreferences(false)
		})

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

		// Catch any errors during initialisation and log them to Sentry.
		defer func() {
			if err := recover(); err != nil {
				sentry.CaptureException(err.(error))
				panic(err)
			}
		}()

		// Take a 1x1 screenshot to ensure that it is ok and the permissions dialog pops up.
		_, err = threadsafescreenshot.GetCapture(1, 1, 1, 1)
		if err != nil {
			sentry.CaptureException(err)
			panic(err)
		}

		// Does any migrations which are needed.
		MigrateFrom2()

		// Loads up the uploader kernel.
		LoadUploadersKernel()

		// Pre-render the editor elements.
		regionselector.PrerenderEditorElements(coreAssets.RobotoLight())

		// Loads the SQLite3 DB.
		LoadDatabase()

		// Manage updates.
		if updater.CurrentUpdater != nil {
			// Make the update server aware of the current bits.
			updater.CurrentUpdater.SetUpdateBits(uint8(ConfigItems["update_bits"].(float64)))
		}
		updater.UpdateFound = HandleUpdateNotification

		// Loads the hotkeys.
		LoadHotkeys()

		// Starts the tray.
		RestartTrayProcess(true)

		// Defines how long it took.
		elapsed := time.Since(StartTime)
		fmt.Printf("Initialisation took %s.\n", elapsed)
	})
}
