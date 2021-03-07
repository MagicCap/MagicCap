// +build darwin

// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

package mainthread

import (
	"runtime"
)

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
		cCall(f)

		// Wait for the function to be complete.
		<-waitChan

		// Do not GC this whatever you do!
		runtime.KeepAlive(f)
	}()
}
