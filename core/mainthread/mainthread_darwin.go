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
	// Get the callback from the pointer.
	cb := (*cb)(CPtr)

	// Call the function.
	cb.function()

	// Mark it as done in the wait group.
	cb.channel <- struct{}{}
}

// ExecMainThread is used to execute a function on the main thread.
func ExecMainThread(Function func()) {
	// Create the callback handler.
	cbh := &cb{
		channel:  make(chan struct{}),
		function: Function,
	}

	// Call the C async function with the pointer.
	fastcgo.UnsafeCall4(C.handle_mainthread, uint64(uintptr(unsafe.Pointer(cbh))), 0, 0, 0)

	// Wait for the function to be complete.
	<-cbh.channel

	// Do not GC this whatever you do!
	runtime.KeepAlive(cbh)
}
