// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

package core

import (
	"github.com/magiccap/MagicCap/core/tray"
	"os"
)

// Exit properly exits the app.
func Exit() {
	if ConfigWindow != nil {
		ConfigWindow.Exit()
	}
	ShortenerWindowsLock.RLock()
	for _, v := range ShortenerWindows {
		v.Exit()
	}
	ShortenerWindowsLock.RUnlock()
	os.Exit(0)
}

// TrayStarted defines if the tray has been started yet.
var TrayStarted = false

// RestartTrayProcess (re)starts the process which is used for the task tray.
func RestartTrayProcess(ColdBoot bool) {
	// Return if this shouldn't boot.
	if !ColdBoot && !TrayStarted {
		return
	}
	if ColdBoot {
		TrayStarted = true
	}

	// Create the tray.
	Callbacks := map[string]func(){
		"quit":       Exit,
		"pref":       func() { OpenPreferences(false) },
		"fullscreen": RunFullscreenCapture,
		"screen":     RunScreenCapture,
		"gif":        RunGIFCapture,
		"clipboard":  RunClipboardCapture,
		"short":      ShowShort,
	}
	ConfiguredUploaders := GetConfiguredUploaders()
	UploaderNames := make([]string, len(ConfiguredUploaders))
	Slugs := make([]string, len(ConfiguredUploaders))
	for i, v := range ConfiguredUploaders {
		UploaderNames[i] = v.Name
		Slugs[i] = v.Slug
		Callbacks["upload"+v.Slug] = func() {
			OpenFileUploader(v.Uploader)
		}
	}
	tray.InitTray(UploaderNames, Slugs, Callbacks)

	// Print when it is done.
	println("Tray initialised.")
}
