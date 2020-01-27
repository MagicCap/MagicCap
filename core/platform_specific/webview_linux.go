// +build linux
// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

package platformspecific

// Webview defines the webview handler.
type Webview struct {}

// Wait is used to wait for a webview. This is blocking and should NOT be ran in the main thread.
func (w *Webview) Wait() {
	// TODO: Implement this!
}

// Exit is used to exit the window. This needs to be ran in the main thread.
func (w *Webview) Exit() {
	// TODO: Implement this!
}

// Focus is used to focus the window. This needs to be ran in the main thread.
func (w *Webview) Focus() {
	// TODO: Implement this!
}

// NewWebview creates a new webview. This should be made from the main thread.
func NewWebview(URL string, Title string, Width int, Height int, Resizable bool) *Webview {
	// TODO: Implement this!
	return &Webview{}
}
