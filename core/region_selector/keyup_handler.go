package regionselector

import "github.com/go-gl/glfw/v3.3/glfw"

// KeyUpHandler is the key up handler.
func KeyUpHandler(index int, keys []*glfw.Key) {
	println(index)
	println(keys)
}
