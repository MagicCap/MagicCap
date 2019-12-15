package editors

import (
	"github.com/go-playground/colors"
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
			for Region.Bounds().Dy() != Y {
				X := 0
				for Region.Bounds().Dx() != X {
					c, err := colors.RGB(RGB[0], RGB[1], RGB[2])
					if err != nil {
						panic(err)
					}
					rgba := c.ToRGBA()
					i.Set(X, Y, &StaticRGBA{
						R: uint32(rgba.R),
						G: uint32(rgba.G),
						B: uint32(rgba.B),
						A: uint32(rgba.A),
					})
					X++
				}
				Y++
			}
			return i
		},
	}
}
