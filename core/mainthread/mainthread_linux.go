// +build linux
// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

package mainthread

import (
	"sync"

	"github.com/gotk3/gotk3/glib"
)

// ExecMainThread is used to execute a function on the main thread.
func ExecMainThread(Function func()) {
	wg := sync.WaitGroup{}
	wg.Add(1)
	glib.IdleAdd(func() {
		Function()
		wg.Done()
	})
	wg.Wait()
}
