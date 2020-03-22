package regionselector

import (
	"bytes"
	"github.com/disintegration/imaging"
	"github.com/magiccap/MagicCap/core/editors"
	"image"
	"image/draw"
	"image/png"
	"sort"
)

var (
	prerenderedDescriptions = map[string]*image.RGBA{}
	preloadedIcons          = map[string]image.Image{}
	editorsOrdered 	        []string
	editorTopBar            *image.RGBA
)

func init() {
	// Pre-render the descriptions/icons for the editors.
	editorsOrdered = make([]string, 0, len(editors.Editors))
	for k, v := range editors.Editors {
		prerenderedDescriptions[k] = RenderText(v.Description, 20)
		p, err := png.Decode(bytes.NewReader(v.Icon))
		if err != nil {
			panic(err)
		}
		preloadedIcons[k] = imaging.Resize(p, 30, 30, imaging.Box)
		editorsOrdered = append(editorsOrdered, k)
	}
	sort.Strings(editorsOrdered)

	// Create the editor top bar.
	editorTopBar = image.NewRGBA(image.Rectangle{Max: image.Pt(100*len(editors.Editors), 50)})
	draw.Draw(editorTopBar, editorTopBar.Rect, image.Black, image.ZP, draw.Over)
}
