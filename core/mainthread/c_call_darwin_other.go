// +build darwin,!amd64

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
	"sync"
)

type count struct {
	i uint64
	m sync.Mutex
}

func (c *count) getValue() uint64 {
	c.m.Lock()
	i := c.i
	c.i = i + 1
	c.m.Unlock()
	return i
}

var (
	m       = map[uint64]func(){}
	mLock   = sync.Mutex{}
	counter = count{}
)

// CCallbackHandler is a function which can be called from C to dispatch the callback.
//export CCallbackHandler
func CCallbackHandler(cbId uint64) {
	mLock.Lock()
	x := m[cbId]
	delete(m, cbId)
	mLock.Unlock()
	if x == nil {
		panic("callback was hit but never mapped - this should never happen!")
	}
	x()
}

func cCall(f func()) {
	id := counter.getValue()
	mLock.Lock()
	m[id] = f
	mLock.Unlock()
	C.uint_to_mainthread(C.ulonglong(id))
}
