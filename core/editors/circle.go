package editors

import (
	"github.com/fogleman/gg"
	"image"
	"image/draw"
)

func init() {
	Editors["circle"] = &Editor{
		Name:        "Circle",
		Description: "Draws a circle on the screen.",
		Icon:        EditorAssets.Bytes("circle.png"),
		Apply: func(Region *image.RGBA, RGB [3]uint8) *image.RGBA {
			// Creates the image.
			img := image.NewRGBA(Region.Bounds())
			draw.Draw(img, img.Rect, Region, image.ZP, draw.Over)

			// Draws the circle.
			Radius := Region.Bounds().Dx()
			if Radius > Region.Bounds().Dy() {
				Radius = Region.Bounds().Dy()
			}
			dc := gg.NewContext(img.Bounds().Dx(), img.Bounds().Dy())
			dc.DrawCircle(float64(Region.Bounds().Dx()), float64(Region.Bounds().Dy()), float64(Radius))
			dc.SetRGB(float64(RGB[0]), float64(RGB[1]), float64(RGB[2]))
			dc.Fill()
			dc.DrawImage(img, 0, 0)

			// Returns the image.
			return img
		},
	}
}
