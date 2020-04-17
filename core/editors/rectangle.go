package editors

import (
	"github.com/magiccap/MagicCap/core/utils"
	"image"
)

func init() {
	Editors["rectangle"] = &Editor{
		Name:        "Rectangle",
		Description: "Draws a rectangle on the screen.",
		Icon:        utils.MustBytes(EditorAssets, "rectangle.png"),
		Apply: func(Region *image.RGBA, RGB [3]uint8) *image.RGBA {
			i := image.NewRGBA(Region.Rect)
			Y := 0
			Block := 0
			for Region.Bounds().Dy() != Y {
				X := 0
				for Region.Bounds().Dx() != X {
					i.Pix[Block] = RGB[0]
					i.Pix[Block+1] = RGB[1]
					i.Pix[Block+2] = RGB[2]
					i.Pix[Block+3] = 255
					Block += 4
					X++
				}
				Y++
			}
			return i
		},
	}
}
