// +build linux
// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

package platformspecific

import (
	"os"
	"github.com/gotk3/gotk3/glib"
	"github.com/gotk3/gotk3/gtk"
)

// ApplicationLoopStart exports a function which is used to start the application loop.
func ApplicationLoopStart(ReadyCallback func()) func() {
    appID := "org.magiccap.magiccap"
    application, err := gtk.ApplicationNew(appID, glib.APPLICATION_FLAGS_NONE)
    if err != nil {
        panic(err)
	}
	application.Connect("activate", ReadyCallback)
	return func() {
		os.Exit(application.Run(nil))
	}
}
