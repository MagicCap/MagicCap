package regionselector

import "github.com/go-gl/glfw/v3.3/glfw"

// KeyUpHandler is the key up handler.
func KeyUpHandler(window *glfw.Window, keys []*glfw.Key) {
	// Iterate all the keys.
	for _, v := range keys {
		switch *v {
		case glfw.KeyEscape:
			window.SetShouldClose(true)
			return
		}
	}
}
