// +build darwin

// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

package tray

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Cocoa
#include <stdlib.h>
#include "tray_darwin.h"
*/
import "C"
import "github.com/magiccap/MagicCap/assets/taskbar"

// ConfiguredHandlers are all of the handlers in use.
var ConfiguredHandlers map[string]func()

// CTrayCallbackHandler is used to handle callbacks from the Go functions.
//export CTrayCallbackHandler
func CTrayCallbackHandler(CallbackName *C.char) {
	CallbackGoString := C.GoString(CallbackName)
	go ConfiguredHandlers[CallbackGoString]()
}

// InitTray is used to initialise the tray.
func InitTray(Uploaders []string, Slugs []string, Handlers map[string]func()) {
	ConfiguredHandlers = Handlers
	Names := make([]*C.char, len(Uploaders))
	SlugsC := make([]*C.char, len(Uploaders))
	i := 0
	for _, v := range Uploaders {
		Names[i] = C.CString(v)
		SlugsC[i] = C.CString(Slugs[i])
		i++
	}
	Icon := taskbar.Icon()
	CIcon := C.CBytes(Icon)
	defer C.free(CIcon)
	C.InitTray(&Names[0], &SlugsC[0], C.int(len(Uploaders)), (*C.uchar)(CIcon), C.ulong(len(Icon)))
}
