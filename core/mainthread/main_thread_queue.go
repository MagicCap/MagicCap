package mainthread

import (
	"sync"
	"time"
)

// Defines a stack item.
type stackItem func() stackItem

// Defines the stack.
var (
	stack        stackItem
	newStackChan = make(chan struct{})
	stackLock    = sync.Mutex{}
)

// Add to the stack.
func addToStack(f func()) {
	stackLock.Lock()
	oldStack := stack
	stack = func() stackItem {
		f()
		return oldStack
	}
	stackLock.Unlock()
	if oldStack == nil {
		newStackChan <- struct{}{}
	}
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

				// Make the stack nil and grab the old stack value.
				oldStack := stack
				stack = nil

				// Unlock the stack.
				stackLock.Unlock()

				// Run all the things in the main thread.
				execMainThread(func() {
					for s := oldStack; s != nil; s = s() {
					}
				})
			})
		}
	}()
}

// ExecMainThread is used to execute functions on the main thread.
// The function will block until it was executed.
func ExecMainThread(Function func()) {
	ret := make(chan struct{})
	addToStack(func() {
		Function()
		ret <- struct{}{}
	})
	<-ret
}
