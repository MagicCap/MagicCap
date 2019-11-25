package core

import (
	"sync"
	"time"

	"github.com/faiface/mainthread"
	"github.com/zserge/webview"
)

// MainThreadLock defines the lock for the main thread.
var MainThreadLock = sync.Mutex{}

// ThreadSafeWebview starts a webview which can be ran on any thread.
func ThreadSafeWebview(Settings webview.Settings) {
	var w *webview.WebView
	mainthread.Call(func() {
		ptr := webview.New(Settings)
		w = &ptr
	})
	for {
		MainThreadLock.Lock()
		mainthread.Call(func() { (*w).Loop(true) })
		MainThreadLock.Unlock()
		time.Sleep(time.Millisecond)
	}
}
