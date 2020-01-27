// +build linux
// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

package platformspecific

import "github.com/gobuffalo/packr"

// TaskbarAssets is used to get assets for the taskbar.
var TaskbarAssets = packr.NewBox("../../assets/taskbar")

// ConfiguredHandlers are all of the handlers in use.
var ConfiguredHandlers map[string]func()

// InitTray is used to initialise the tray.
func InitTray(Uploaders []string, Slugs []string, Handlers map[string]func()) {
	// TODO: Implement this!
}
