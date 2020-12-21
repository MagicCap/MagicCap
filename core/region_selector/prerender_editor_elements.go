package regionselector

import (
	"bytes"
	"github.com/disintegration/imaging"
	"github.com/golang/freetype"
	"github.com/magiccap/MagicCap/assets/editor"
	"github.com/magiccap/MagicCap/core/editors"
	"image"
	"image/color"
	"image/draw"
	"image/png"
)

var (
	preloadedIcons          = map[string]image.Image{}
	editorsOrdered          []string
	editorTopBar            *image.RGBA
	SelectedItemRender      []byte
)

// PrerenderEditorElements is used to pre-render editor elements.
func PrerenderEditorElements(FontBytes []byte) {
	// Load in the Roboto font.
	r, err := freetype.ParseFont(FontBytes)
	if err != nil {
		panic(err)
	}
	Roboto = r

	// Pre-render the selector icon.
	p, err := png.Decode(bytes.NewReader(editor.Crosshair()))
	if err != nil {
		panic(err)
	}
	preloadedIcons["__selector"] = imaging.Resize(p, 30, 30, imaging.Box)

	// Create the editor top bar.
	editorTopBar = image.NewRGBA(image.Rectangle{Max: image.Pt(100*(len(editors.Editors)+1), 50)})
	draw.Draw(editorTopBar, editorTopBar.Rect, image.Black, image.ZP, draw.Over)

	// Pre-render the selected item highlight.
	i := image.NewRGBA(image.Rectangle{Max: image.Pt(100, 50)})
	y := 0
	for y != i.Rect.Dy() {
		x := 0
		for x != i.Rect.Dx() {
			i.Set(x, y, color.RGBA{0, 137, 177, 0xFF})
			x++
		}
		y++
	}
	SelectedItemRender = i.Pix
}
