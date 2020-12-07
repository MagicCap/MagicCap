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
	"github.com/jakemakesstuff/fastcgo"
	"runtime"
	"unsafe"
)

// CCallbackHandler is a function which can be called from C to dispatch the callback.
//export CCallbackHandler
func CCallbackHandler(CPtr unsafe.Pointer) {
	(*(*func())(CPtr))()
}

// This is used to execute a function on the main thread. This does not implement any queue system.
func execMainThread(Function func()) {
	// We need to wait in another go-routine. If we don't do this, we will hit an issue with GC.
	go func() {
		// The channel for the wait.
		waitChan := make(chan struct{})

		// Call the C async function with the pointer.
		f := func() {
			Function()
			waitChan <- struct{}{}
		}
		fastcgo.UnsafeCall4(C.handle_mainthread, uint64(uintptr(unsafe.Pointer(&f))), 0, 0, 0)

		// Wait for the function to be complete.
		<-waitChan

		// Do not GC this whatever you do!
		runtime.KeepAlive(f)
	}()
}
