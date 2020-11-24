package mainthread

import (
	"sync"
	"time"
)

// Defines a stack item.
type stackItem struct {
	prev     *stackItem
	function func()
}

// Defines the stack.
var (
	stack        *stackItem
	newStackChan = make(chan struct{})
	stackLen     = 0
	stackLock    = sync.Mutex{}
)

// Add to the stack.
func addToStack(f func()) {
	stackLock.Lock()
	stack = &stackItem{
		prev:     stack,
		function: f,
	}
	stackLen++
	if stackLen == 1 {
		newStackChan <- struct{}{}
	}
	stackLock.Unlock()
}

// Defines the stack handler.
func init() {
	go func() {
		for {
			// Get the new stack event.
			<-newStackChan

			// Flush the stack in 5ns (give the stack some time to populate).
			time.AfterFunc(time.Nanosecond*5, func() {
				// Lock the stack.
				stackLock.Lock()

				// Make an array of functions.
				a := make([]func(), stackLen)

				// Add all the functions to the array.
				for i := stackLen - 1; i != -1; i-- {
					a[i] = stack.function
					stack = stack.prev
				}

				// Reset the stack length.
				stackLen = 0

				// Unlock the stack.
				stackLock.Unlock()

				// Run in the main thread.
				execMainThread(func() {
					for _, v := range a {
						v()
					}
				})
			})
		}
	}()
}

// ExecMainThread is used to execute functions on the main thread.
func ExecMainThread(Function func()) {
	ret := make(chan struct{})
	addToStack(func() {
		Function()
		ret <- struct{}{}
	})
	<-ret
}
