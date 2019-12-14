package regionselector

import "github.com/faiface/glhf"

// HandleWindow is used to handle a window.
func HandleWindow(shader *glhf.Shader, texture *glhf.Texture) {
	// Create the vertex slice.
	slice := glhf.MakeVertexSlice(shader, 6, 6)
	slice.Begin()
	slice.SetVertexData([]float32{
		-1, -1, 0, 1,
		+1, -1, 1, 1,
		+1, +1, 1, 0,

		-1, -1, 0, 1,
		+1, +1, 1, 0,
		-1, +1, 0, 0,
	})
	slice.End()

	// Clear the window.
	glhf.Clear(1, 1, 1, 1)

	// Render everything.
	shader.Begin()
	texture.Begin()
	slice.Begin()
	slice.Draw()
	slice.End()
	shader.End()
}
