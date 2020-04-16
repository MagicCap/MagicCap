package editors

import (
	"github.com/disintegration/gift"
	"image"
	"image/draw"
)

func init() {
	Editors["hollowRectangle"] = &Editor{
		Name:        "Hollow Rectangle",
		Description: "Draws a hollow rectangle on the screen.",
		Icon:        EditorAssets.Bytes("hollow_rectangle.png"),
		Apply: func(Region *image.RGBA, RGB [3]uint8) *image.RGBA {
			// Gets the first/last block line.
			RowSize := Region.Rect.Dx()*4
			FirstBlockLine := RowSize
			if Region.Rect.Dy() >= 4 {
				FirstBlockLine *= 2
			}
			ArrSize := (Region.Rect.Dx()*Region.Rect.Dy())*4
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
			x = ArrSize-1
			y := 3
			for x != LastBlockLine {
				img.Pix[x] = ByteMap[y]
				y--
				if y == -1 {
					y = 3
				}
				x--
			}

			// Draw the sides of the hollow rectangle.
			SideLine := image.NewRGBA(image.Rect(Region.Rect.Min.X,  Region.Rect.Min.Y, Region.Rect.Min.X+1, Region.Rect.Max.Y))
			x = 0
			y = 0
			for x != len(SideLine.Pix) {
				SideLine.Pix[x] = ByteMap[y]
				y++
				if y == 4 {
					y = 0
				}
				x++
			}
			draw.Draw(img, SideLine.Rect, SideLine, image.ZP, draw.Src)

			// Returns the image.
			return img
		},
	}
}
