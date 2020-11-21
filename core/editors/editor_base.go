package editors

import "image"

// Editors defines all of the editors.
var Editors = map[string]*Editor{}

// Editor is the base for any created editors.
type Editor struct {
	Name        string
	Description string
	Icon        []byte
	Apply       func(Region *image.RGBA, RGB [3]uint8) *image.RGBA
}
