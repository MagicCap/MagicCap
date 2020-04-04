package editors

import (
	"image"
)

// StaticRGBA is a struct used for static RGBA values.
type StaticRGBA struct {
	R uint32
	G uint32
	B uint32
	A uint32
}

// RGBA exposes the RGBA values.
func (s *StaticRGBA) RGBA() (r uint32, g uint32, b uint32, a uint32) {
	return s.R, s.G, s.B, s.A
}

func init() {
	Editors["rectangle"] = &Editor{
		Name:        "Rectangle",
		Description: "Draws a rectangle on the screen.",
		Icon:        EditorAssets.Bytes("rectangle.png"),
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
