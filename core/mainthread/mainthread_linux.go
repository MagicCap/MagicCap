// +build linux
// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

package mainthread

import (
	"github.com/gotk3/gotk3/glib"
)

// This is used to execute a function on the main thread. This does not implement any queue system.
func execMainThread(Function func()) {
	go glib.IdleAdd(func() {
		Function()
	})
}
