// +build darwin,amd64

// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2021.

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

func cCall(f func()) {
	fastcgo.UnsafeCall4(C.handle_mainthread, uint64(uintptr(unsafe.Pointer(&f))), 0, 0, 0)
	runtime.KeepAlive(f)
}
