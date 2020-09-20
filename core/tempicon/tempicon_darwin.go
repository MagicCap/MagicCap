// +build darwin

// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

package tempicon

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Cocoa
#include <stdlib.h>
#include "tempicon_darwin.h"
*/
import "C"
import "sync"

// ConfiguredHandlers are all of the handlers in use.
var ConfiguredHandlers = map[int]func(){}

// NextHandler is the ID of the next handler.
var NextHandler = 0

// NextHandlerLock is the thread lock for the next handler.
var NextHandlerLock = sync.Mutex{}

// CTempIconCallbackHandler is used to handle callbacks from the Go functions.
//export CTempIconCallbackHandler
func CTempIconCallbackHandler(CallbackID C.int) {
	c := int(CallbackID)
	if c != -1 {
		ConfiguredHandlers[c]()
	}
}

// TempIcon is the structure which is used for a temp icon.
type TempIcon struct {
	CallbackID int
	CIcon *C.NSStatusItem
}

// CloseIcon is used to close the icon.
func (t *TempIcon) CloseIcon() {
	if t.CallbackID != -1 {
		delete(ConfiguredHandlers, t.CallbackID)
	}
	C.CloseIcon(t.CIcon)
}

// InitTempIcon is used to initialise the temp icon.
func InitTempIcon(Icon []byte, Handler func(), _ string) *TempIcon {
	HandlerID := -1
	if Handler != nil {
		NextHandlerLock.Lock()
		HandlerID = NextHandler
		NextHandler++
		ConfiguredHandlers[HandlerID] = Handler
		NextHandlerLock.Unlock()
	}
	CIcon := C.CBytes(Icon)
	defer C.free(CIcon)
	return &TempIcon{
		CallbackID: HandlerID,
		CIcon:      C.InitTempIcon(C.int(HandlerID), (*C.uchar)(CIcon), C.ulong(len(Icon))),
	}
}
