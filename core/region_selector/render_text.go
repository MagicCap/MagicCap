package regionselector

import (
	"image"
	"image/draw"

	"github.com/gobuffalo/packr"
	"github.com/golang/freetype"
	"github.com/golang/freetype/truetype"
	"golang.org/x/image/font"
	"golang.org/x/image/math/fixed"
)

// RenderAssets is the assets which are used to render.
var RenderAssets = packr.NewBox("../../assets/render")

// Roboto is the main font which we are using.
var Roboto, _ = freetype.ParseFont(RenderAssets.Bytes("Roboto-Light.ttf"))

// RenderText is used to render the text into an image.
func RenderText(Text string, FontSize int) *image.RGBA {
	// Create the font image.
	f := float64(FontSize)
	d := &font.Drawer{
		Dst: nil,
		Src: image.White,
		Face: truetype.NewFace(Roboto, &truetype.Options{
			Size: f,
			DPI:  72,
		}),
		Dot: fixed.P(10, FontSize),
	}
	ad := d.MeasureString(Text)
	FontImg := image.NewRGBA(image.Rect(0, 0, ad.Ceil()+20, FontSize+(FontSize/2)))
	draw.Draw(FontImg, FontImg.Rect, image.Black, image.ZP, draw.Src)
	d.Dst = FontImg
	d.DrawString(Text)

	// Return the font image.
	return FontImg
}
