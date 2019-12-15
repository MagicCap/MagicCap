package editors

import (
	"github.com/disintegration/gift"
	"image"
)

func init() {
	Editors["pixelate"] = &Editor{
		Name:        "Pixelate",
		Description: "Allows you to pixelate a image.",
		Icon:        EditorAssets.Bytes("pixelate.png"),
		Apply: func(Region *image.RGBA, _ [3]uint8) *image.RGBA {
			g := gift.New(
				gift.Pixelate(10),
			)
			img := image.NewRGBA(Region.Bounds())
			g.Draw(img, Region)
			return img
		},
	}
}
