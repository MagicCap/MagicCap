package core

import (
	"time"

	"github.com/faiface/mainthread"
	"github.com/zserge/webview"
)

// ThreadSafeWebview starts a webview which can be ran on any thread.
func ThreadSafeWebview(Settings webview.Settings) {
	var w *webview.WebView
	mainthread.Call(func() {
		ptr := webview.New(Settings)
		w = &ptr
	})
	for {
		mainthread.Call(func() { (*w).Loop(true) })
		time.Sleep(time.Millisecond)
	}
}
