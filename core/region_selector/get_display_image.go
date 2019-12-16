package regionselector

import (
	img "image"
	"image/draw"
	"sync"
)

// GetDisplayImage is used to get the image to show up on the display.
func GetDisplayImage(
	DisplayPoint *img.Point, image *img.NRGBA, FirstPos *img.Point,
	LastPos *img.Point, OriginalScreenshot *img.RGBA,
) *img.NRGBA {
	ImageEdit := image
	if DisplayPoint != nil {
		// Copy the image.
		b := ImageEdit.Bounds()
		ImageCpy := img.NRGBA{
			Pix:    make([]byte, len(ImageEdit.Pix)),
			Stride: ImageEdit.Stride,
			Rect:   ImageEdit.Rect,
		}
		for i, v := range ImageEdit.Pix {
			ImageCpy.Pix[i] = v
		}
		ImageEdit = &ImageCpy

		// Handles the region selection.
		if FirstPos != nil {
			Rect := img.Rect(FirstPos.X, FirstPos.Y, LastPos.X, LastPos.Y)
			RegionCropped := OriginalScreenshot.SubImage(Rect)
			draw.FloydSteinberg.Draw(ImageEdit, Rect, RegionCropped, Rect.Min)
		}

		// Handles the drawing of the crosshair on the screen.
		Height := b.Dy()
		Width := b.Dx()
		HeightComplete := 0
		PixelOffset := ImageEdit.PixOffset(DisplayPoint.X, 0)
		wg := sync.WaitGroup{}
		wg.Add(Height + Width)
		for HeightComplete != Height {
			go func(offset int) {
				defer wg.Done()
				ImageEdit.Pix[offset+1] = 255 // R
				ImageEdit.Pix[offset+2] = 255 // G
				ImageEdit.Pix[offset+3] = 255 // B
				ImageEdit.Pix[offset+4] = 255 // A
			}(PixelOffset)
			PixelOffset = ImageEdit.PixOffset(DisplayPoint.X, HeightComplete)
			HeightComplete++
		}
		WidthComplete := 0
		PixelOffset = ImageEdit.PixOffset(0, DisplayPoint.Y)
		for WidthComplete != Width {
			go func(offset int) {
				defer wg.Done()
				ImageEdit.Pix[offset+1] = 255 // R
				ImageEdit.Pix[offset+2] = 255 // G
				ImageEdit.Pix[offset+3] = 255 // B
				ImageEdit.Pix[offset+4] = 255 // A
			}(PixelOffset)
			PixelOffset = ImageEdit.PixOffset(WidthComplete, DisplayPoint.Y)
			WidthComplete++
		}
		wg.Wait()
	}

	// Returns the image.
	return ImageEdit
}
