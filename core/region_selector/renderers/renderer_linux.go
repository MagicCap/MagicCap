// +build linux

package renderers

// OSRenderer defines the current renderer.
func OSRenderer() Renderer {
	return &openGLRenderer{}
}
