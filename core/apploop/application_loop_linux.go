// +build linux
// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

package apploop

import (
	"os"
	"runtime"

	"github.com/gotk3/gotk3/glib"
	"github.com/gotk3/gotk3/gtk"
)

// mainApplication is the initalised application.
var mainApplication *gtk.Application

// appID is the ID of the application.
var appID = "org.magiccap.magiccap"

// ApplicationLoopStart is used to start the application loop.
func ApplicationLoopStart(ReadyCallback func()) {
	// Lock the OS thread.
	runtime.LockOSThread()

	// Create the application.
	application, err := gtk.ApplicationNew(appID, glib.APPLICATION_FLAGS_NONE)
	if err != nil {
		panic(err)
	}

	application.Connect("activate", func() {
		// I'm aware this is super hacky, but it works!
		w, err := gtk.WindowNew(0)
		if err != nil {
			panic(err)
		}
		w.Present()
		w.Hide()
		application.AddWindow(w)

		// Call the ready callback.
		ReadyCallback()
	})

	// Run the application.
	mainApplication = application
	os.Exit(application.Run(nil))
}
