// +build darwin

package renderers

// OSRenderer defines the current renderer.
func OSRenderer() Renderer {
	return &openGLRenderer{}
}
