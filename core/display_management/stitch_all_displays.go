package displaymanagement

import (
	"image"
	"image/color"
	"image/draw"

	"github.com/disintegration/imaging"
)

// StitchAllDisplays is used to stitch all of the displays together.
func StitchAllDisplays() *image.NRGBA {
	// Gets the images/displays.
	AllDisplays := GetActiveDisplays()
	Images := CaptureAllDisplays(AllDisplays)

	// Get the min/max X/Y.
	MaxY := 0
	MaxX := 0
	MinX := 0
	MinY := 0
	for _, v := range AllDisplays {
		if v.Max.Y > MaxY {
			MaxY = v.Max.Y
		}
		if MinY > v.Max.Y {
			MinY = v.Max.Y
		}
		if v.Max.X > MaxX {
			MaxX = v.Max.X
		}
		if MinX > v.Min.X {
			MinX = v.Min.X
		}
	}

	// Gets the negative side.
	XLeftSide := 0
	YLeftSide := 0
	if 0 > MinY {
		YLeftSide = MinY * -1
	}
	if 0 > MinX {
		XLeftSide = MinX * -1
	}

	// Creates the new canvas.
	img := imaging.New(MaxX+XLeftSide, MaxY+YLeftSide, color.Black)

	// Draws the image on the canvas.
	for i, v := range Images {
		XL := AllDisplays[i].Min.X + XLeftSide
		YL := AllDisplays[i].Min.Y + YLeftSide
		NewRect := image.Rect(XL, YL, v.Rect.Dx()+XL, v.Rect.Dy()+YL)
		v.Rect = NewRect
		draw.Draw(img, NewRect, v, image.Point{
			X: XL,
			Y: YL,
		}, draw.Src)
	}

	// Returns the image.
	return img
}
