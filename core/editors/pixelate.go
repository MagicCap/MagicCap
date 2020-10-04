package editors

import (
	"github.com/disintegration/gift"
	"github.com/magiccap/MagicCap/core/utils"
	"image"
)

func init() {
	Editors["pixelate"] = &Editor{
		Name:        "Pixelate",
		Description: "Allows you to pixelate a image.",
		Icon:        utils.MustBytes(EditorAssets, "pixelate.png"),
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
