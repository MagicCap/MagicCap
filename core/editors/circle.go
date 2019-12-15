package editors

import (
	"github.com/rustyoz/svg"
	"image"
)

func init() {
	Editors["circle"] = &Editor{
		Name:        "Circle",
		Description: "Draws a circle on the screen.",
		Icon:        EditorAssets.Bytes("circle.png"),
		Apply: func(Region *image.RGBA, RGB [3]uint32) *image.RGBA {
			img := image.NewRGBA(Region.Bounds())
			for i, v := range Region.Pix {
				img.Pix[i] = v
			}
			s, err := svg.ParseSvg("", "circle", 1)
			if err != nil {
				panic(err)
			}
			return img
		},
	}
}
