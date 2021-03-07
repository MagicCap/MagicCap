// +build linux

package renderers

import (
	"github.com/magiccap/MagicCap/core/region_selector/renderers/opengl"
	"github.com/magiccap/MagicCap/core/region_selector/renderers/types"
)

// OSRenderer defines the current renderer.
func OSRenderer() types.Renderer {
	return &opengl.Renderer{}
}
