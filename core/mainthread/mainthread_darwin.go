// +build darwin

// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

package mainthread

/*
#cgo CFLAGS: -x objective-c -O3
#include <stdlib.h>
#include "mainthread_darwin.h"
*/
import "C"
import (
	"unsafe"
)

type cb struct {
	channel  chan struct{}
	function func()
}

// CCallbackHandler is a function which can be called from C to dispatch the callback.
//export CCallbackHandler
func CCallbackHandler(CPtr unsafe.Pointer) {
	// Call the function.
	(func())(CPtr)()
}

// This is used to execute a function on the main thread. This does not implement any queue system.
func execMainThread(Function func()) {
	// Call the C async function with the pointer.
	fastcgo.UnsafeCall4(C.handle_mainthread, uint64(uintptr(unsafe.Pointer(Function))), 0, 0, 0)

	// Wait for the function to be complete.
	<-cbh.channel

	// Do not GC this whatever you do!
	runtime.KeepAlive(Function)
}
