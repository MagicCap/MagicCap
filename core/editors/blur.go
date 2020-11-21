package editors

import (
	"github.com/disintegration/gift"
	"github.com/magiccap/MagicCap/assets/editor"
	"image"
)

func init() {
	Editors["blur"] = &Editor{
		Name:        "Blur",
		Description: "Allows you to blur a image.",
		Icon:        editor.Blur,
		Apply: func(Region *image.RGBA, _ [3]uint8) *image.RGBA {
			g := gift.New(
				gift.GaussianBlur(20),
			)
			img := image.NewRGBA(Region.Bounds())
			g.Draw(img, Region)
			return img
		},
	}
}
