// +build linux
// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

package webview

import (
	"sync"

	webkit "github.com/andre-hub/go-webkit2"
	"github.com/gotk3/gotk3/gtk"
)

// Webview defines the webview handler.
type Webview struct {
	window *gtk.Window
	wg     *sync.WaitGroup
}

// Wait is used to wait for a webview. This is blocking and should NOT be ran in the main thread.
func (w *Webview) Wait() {
	w.wg.Wait()
}

// Exit is used to exit the window. This needs to be ran in the main thread.
func (w *Webview) Exit() {
	w.window.Close()
}

// Focus is used to focus the window. This needs to be ran in the main thread.
func (w *Webview) Focus() {
	w.window.Present()
}

// NewWebview creates a new webview. This should be made from the main thread.
func NewWebview(URL string, Title string, Width int, Height int, Resizable bool) *Webview {
	// Create the window.
	win, err := gtk.WindowNew(gtk.WINDOW_TOPLEVEL)
	if err != nil {
		panic(err)
	}

	// Set the window title.
	win.SetTitle(Title)

	// Set the width/height.
	win.SetDefaultSize(Width, Height)

	// Set if it is resizable.
	win.SetResizable(Resizable)

	// Create a wait group for the view.
	wg := sync.WaitGroup{}
	wg.Add(1)

	// Mark as done when the window is destroyed.
	win.Connect("destroy", func() {
		wg.Done()
	})

	// Create the webview, set the URL and associate it with the window.
	wv, err := webkit.WebViewNew()
	if err != nil {
		panic(err)
	}
	win.Add(wv)
	win.ShowAll()
	wv.LoadURI(URL)

	// Present the window.
	win.Present()

	// Return the Webview struct.
	return &Webview{wg: &wg, window: win}
}
