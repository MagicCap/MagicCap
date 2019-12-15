package editors

import (
	"github.com/esimov/stackblur-go"
	"image"
)

func init() {
	Editors["blur"] = &Editor{
		Name:        "Blur",
		Description: "Allows you to blur a image.",
		Icon:        EditorAssets.Bytes("blur.png"),
		Apply: func(Region *image.RGBA, _ [3]uint8) *image.RGBA {
			img := stackblur.Process(Region, uint32(20))
			return img.(*image.RGBA)
		},
	}
}
