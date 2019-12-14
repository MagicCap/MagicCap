package editors

import (
	"github.com/gobuffalo/packr"
	"image"
)

// EditorAssets contains all of the data from editor assets when compiled.
var EditorAssets = packr.NewBox("../assets/editor")

// Editors defines all of the editors.
var Editors = map[string]*Editor{}

// Editor is the base for any created editors.
type Editor struct {
	Name string
	Description string
	Icon []byte
	Apply func(Region *image.RGBA, RGB []uint8) *image.RGBA
}
