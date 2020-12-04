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
	"runtime"
	"unsafe"
	"github.com/magiccap/fastcgo"
)

// CCallbackHandler is a function which can be called from C to dispatch the callback.
//export CCallbackHandler
func CCallbackHandler(CPtr unsafe.Pointer, WaitChan unsafe.Pointer) {
	// Call the function.
	(func())(CPtr)()

	// Stop waiting.
	<-WaitChan
}

// This is used to execute a function on the main thread. This does not implement any queue system.
func execMainThread(Function func()) {
	// The channel for the wait.
	waitChan := make(chan struct{})

	// Call the C async function with the pointer.
	fastcgo.UnsafeCall4(C.handle_mainthread, uint64(uintptr(unsafe.Pointer(Function))), uint64(uintptr(unsafe.Pointer(waitChan))), 0, 0)

	// Wait for the function to be complete.
	<-waitChan

	// Do not GC this whatever you do!
	runtime.KeepAlive(Function)
	runtime.KeepAlive(waitChan)
}
