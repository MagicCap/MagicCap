package editors

import (
	"github.com/fogleman/gg"
	"image"
)

func init() {
	Editors["hollowRectangle"] = &Editor{
		Name:        "Hollow Rectangle",
		Description: "Draws a hollow rectangle on the screen.",
		Icon:        EditorAssets.Bytes("hollow_rectangle.png"),
		Apply: func(Region *image.RGBA, RGB [3]uint8) *image.RGBA {
			// Creates the image.
			img := image.NewRGBA(Region.Bounds())
			for i, v := range Region.Pix {
				img.Pix[i] = v
			}

			// Draws the hollow rectangle.
			dc := gg.NewContext(img.Bounds().Dx(), img.Bounds().Dy())
			dc.SetRGB(float64(RGB[0]), float64(RGB[1]), float64(RGB[2]))
			dc.DrawRectangle(0, 0, float64(Region.Bounds().Dx()), float64(Region.Bounds().Dy()))
			dc.DrawImage(img, 0, 0)

			// Returns the image.
			return img
		},
	}
}
