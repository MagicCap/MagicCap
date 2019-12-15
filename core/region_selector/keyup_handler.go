package regionselector

import "github.com/go-gl/glfw/v3.3/glfw"

// KeyUpHandler is the key up handler.
func KeyUpHandler(window *glfw.Window, keys []*glfw.Key, dispatcher *EventDispatcher) {
	// Handles 1 key gestures.
	if len(keys) == 1 {
		switch *keys[0] {
		case glfw.KeyEscape:
			window.SetShouldClose(true)
			return
		case glfw.KeyF:
			if dispatcher.EscapeHandler != nil {
				dispatcher.EscapeHandler()
				return
			}
			window.SetShouldClose(true)
			dispatcher.ShouldFullscreenCapture = true
			return
		}
	}
}
