package editors

import (
	"github.com/esimov/stackblur-go"
	"github.com/magiccap/MagicCap/core/utils"
	"image"
	"image/draw"
)

func init() {
	Editors["blur"] = &Editor{
		Name:        "Blur",
		Description: "Allows you to blur a image.",
		Icon:        utils.MustBytes(EditorAssets, "blur.png"),
		Apply: func(Region *image.RGBA, _ [3]uint8) *image.RGBA {
			img := stackblur.Process(Region, uint32(20))
			i := image.NewRGBA(img.(*image.NRGBA).Rect)
			draw.Draw(i, i.Rect, img, image.ZP, draw.Src)
			return i
		},
	}
}
