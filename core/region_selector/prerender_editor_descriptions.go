package regionselector

import (
	"github.com/magiccap/MagicCap/core/editors"
	"image"
)

var prerenderedDescriptions = map[string]*image.RGBA{}

func init() {
	for k, v := range editors.Editors {
		prerenderedDescriptions[k] = RenderText(v.Description, 20)
	}
}
