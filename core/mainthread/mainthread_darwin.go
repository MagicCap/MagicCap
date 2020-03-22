// +build darwin

// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

package mainthread

/*
#cgo CFLAGS: -x objective-c
#include <stdlib.h>
#include "mainthread_darwin.h"
*/
import "C"
import "sync"

// TotalCalls are all of the calls made. Used for the below map.
var TotalCalls = 0

// Calls are all of the currently being used.
// This is not an array since they will be removed when they are done, potentially leading to a race condition.
var Calls = map[int]func(){}

// CallsWaiters is a map of wait groups.
var CallsWaiters = map[int]*chan bool{}

// CallsLock is the thread lock used for callbacks.
var CallsLock = sync.Mutex{}

// CCallbackHandler is a function which can be called from C to dispatch the callback.
//export CCallbackHandler
func CCallbackHandler(CIndex C.int) {
	// Get the int value.
	Index := int(CIndex)

	// Lock the calls lock.
	CallsLock.Lock()

	// Get the function and wait group and delete them when fetched.
	Function := Calls[Index]
	ret := CallsWaiters[Index]
	delete(Calls, Index)
	delete(CallsWaiters, Index)

	// Unlock the calls lock.
	CallsLock.Unlock()

	// Call the function.
	Function()

	// Mark it as done in the wait group.
	*ret <- true
}

// ExecMainThread is used to execute a function on the main thread.
func ExecMainThread(Function func()) {
	// Lock the calls lock.
	CallsLock.Lock()

	// Set the index.
	Index := TotalCalls

	// Create the return channel.
	ret := make(chan bool)
	CallsWaiters[Index] = &ret

	// Insert the function call.
	Calls[Index] = Function

	// Add 1 to total calls.
	TotalCalls++

	// Unlock the calls lock.
	CallsLock.Unlock()

	// Call the C async function with the index.
	C.handle_mainthread(C.int(Index))

	// Wait for the function to be complete.
	<-ret
}
