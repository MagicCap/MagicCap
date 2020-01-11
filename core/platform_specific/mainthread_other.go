// +build !darwin

// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

package platformspecific

import "github.com/faiface/mainthread"

// ExecMainThread is used to execute a function on the main thread.
func ExecMainThread(Function func()) {
	mainthread.Call(Function)
}
