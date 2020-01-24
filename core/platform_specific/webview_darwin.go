// +build darwin

// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

package platformspecific

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Webkit
#include <stdlib.h>
#import <WebKit/WebKit.h>
#include "webview_darwin.h"
*/
import "C"
import "unsafe"
import "sync"

// currentWebviewListener is the current webview listener.
var currentWebviewListener = 0

// webviewListeners are all of the webview listeners.
var webviewListeners = map[int]*sync.WaitGroup{}

// Webview defines the webview handler.
type Webview struct {
	CWebview *C.NSWindow
	wg       *sync.WaitGroup
}

// CWebviewClose is used to handle callbacks from the webview closing.
//export CWebviewClose
func CWebviewClose(Listener int) {
	webviewListeners[Listener].Done()
	delete(webviewListeners, Listener)
}

// Wait is used to wait for a webview. This is blocking and should NOT be ran in the main thread.
func (w *Webview) Wait() {
	w.wg.Wait()
}

// Exit is used to exit the window. This needs to be ran in the main thread.
func (w *Webview) Exit() {
	C.ExitWebview(w.CWebview)
}

// Focus is used to focus the window. This needs to be ran in the main thread.
func (w *Webview) Focus() {
	C.FocusWebview(w.CWebview)
}

// NewWebview creates a new webview. This should be made from the main thread.
func NewWebview(URL string, Title string, Width int, Height int, Resizable bool) *Webview {
	URLLen := len(URL)
	URLC := C.CString(URL)
	defer C.free(unsafe.Pointer(URLC))
	TitleLen := len(Title)
	TitleC := C.CString(Title)
	defer C.free(unsafe.Pointer(TitleC))
	listener := currentWebviewListener
	currentWebviewListener++
	wg := sync.WaitGroup{}
	wg.Add(1)
	webviewListeners[listener] = &wg
	return &Webview{
		CWebview: C.MakeWebview(
			URLC, C.int(URLLen), TitleC, C.int(TitleLen), C.int(Width), C.int(Height),
			C.bool(Resizable), C.int(listener)),
		wg: &wg,
	}
}
