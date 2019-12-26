// +build darwin
// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

package platformspecific

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Cocoa
#include <stdlib.h>
#include "hotkeys_darwin.h"
*/
import "C"

// UnloadHotkey is used to unload a hotkey ID.
func UnloadHotkey(HotkeyID string) {
	C.UnloadHotkey(C.CString(HotkeyID))
}

// LoadHotkey is used to load in a hotkey.
func LoadHotkey(Keys string, Callback func()) string {
	return C.GoString(C.LoadHotkey())
}
