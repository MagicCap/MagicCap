package editors

import (
	"github.com/disintegration/gift"
	"github.com/magiccap/MagicCap/assets/editor"
	"image"
)

func init() {
	Editors["hollowRectangle"] = &Editor{
		Name:        "Hollow Rectangle",
		Description: "Draws a hollow rectangle on the screen.",
		Icon:        editor.HollowRectangle(),
		Apply: func(Region *image.RGBA, RGB [3]uint8) *image.RGBA {
			// Gets the first/last block line.
			X := Region.Rect.Dx()
			Y := Region.Rect.Dy()
			RowSize := X * 4
			FirstBlockLine := RowSize
			if Y >= 4 {
				FirstBlockLine *= 2
			}
			ArrSize := (X * Y) * 4
			LastBlockLine := ArrSize - FirstBlockLine

			// Creates the image.
			g := gift.New()
			img := image.NewRGBA(Region.Rect)
			g.Draw(img, Region)

			// Draws the top and bottom of the hollow rectangle.
			x := 0
			ByteMap := [4]uint8{RGB[0], RGB[1], RGB[2], 255}
			for i := range img.Pix {
				if i > FirstBlockLine {
					break
				}
				img.Pix[i] = ByteMap[x]
				x++
				if x == 4 {
					x = 0
				}
			}
			x = ArrSize - 1
			y := 3
			for x != LastBlockLine {
				img.Pix[x] = ByteMap[y]
				y--
				if y == -1 {
					y = 3
				}
				x--
			}

			// Draws the left and right of the hollow rectangle.
			for i := 0; i < Y; i++ {
				// Get the start of the row.
				RowStart := i * RowSize

				// Set the left/right side.
				img.Pix[RowStart] = RGB[0]
				img.Pix[RowStart+1] = RGB[1]
				img.Pix[RowStart+2] = RGB[2]
				img.Pix[RowStart+3] = 255
				RightSideStart := RowStart + (RowSize - 4)
				img.Pix[RightSideStart] = RGB[0]
				img.Pix[RightSideStart+1] = RGB[1]
				img.Pix[RightSideStart+2] = RGB[2]
				img.Pix[RightSideStart+3] = 255
			}

			// Returns the image.
			return img
		},
	}
}
