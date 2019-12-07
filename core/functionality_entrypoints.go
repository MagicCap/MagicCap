package core

import "github.com/MagicCap/MagicCap/core/platform_specific"

// ShowShort shows the shortener screen.
func ShowShort() {
	// TODO: Implement this!
	println("ShowShort")
}

// RunScreenCapture runs a screen capture.
func RunScreenCapture() {
	// TODO: Implement this!
	println("RunScreenCapture")
}

// RunGIFCapture runs a GIF capture.
func RunGIFCapture() {
	// TODO: Implement this!
	println("RunGIFCapture")
}

// RunClipboardCapture runs a clipboard capture.
func RunClipboardCapture() {
	// TODO: Implement this!
	println(platformspecific.GetClipboard())
	println("RunClipboardCapture")
}
