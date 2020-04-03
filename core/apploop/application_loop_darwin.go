// +build darwin
// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

package apploop

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Cocoa
#include <stdlib.h>
#include "application_loop_darwin.h"
*/
import "C"
import "runtime"

// OnReady is a function that will be called by the C ready function.
var OnReady func()

// CReadyCallback is the callback which will be called by C.
//export CReadyCallback
func CReadyCallback() {
	OnReady()
}

// ApplicationLoopStart is used to start the application loop.
func ApplicationLoopStart(ReadyCallback func()) {
	OnReady = ReadyCallback
	runtime.LockOSThread()
	C.DelegateInit()
}
