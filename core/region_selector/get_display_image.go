package regionselector

import (
	"bytes"
	img "image"
	"image/png"

	"github.com/jakemakesstuff/lilliput"
)

// GetDisplayImage is used to get the image to show up on the display.
func GetDisplayImage(
	DisplayPoint *img.Point, image *img.RGBA, FirstPos *img.Point,
	LastPos *img.Point, OriginalScreenshot *img.RGBA,
) *img.RGBA {
	ImageEdit := image
	if DisplayPoint != nil {
		// Copy the image.
		b := ImageEdit.Bounds()
		ImageCpy := img.RGBA{
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
			// Get the source part.
			Rect := img.Rect(FirstPos.X, FirstPos.Y, LastPos.X, LastPos.Y)
			RegionCropped := OriginalScreenshot.SubImage(Rect).(*img.RGBA)

			// Decode the source.
			s := b.Size()
			enc := &png.Encoder{
				CompressionLevel: png.NoCompression,
			}
			buf := bytes.Buffer{}
			err := enc.Encode(&buf, RegionCropped)
			if err != nil {
				return ImageEdit
			}
			Decoder, err := lilliput.NewDecoder(buf.Bytes())
			if err != nil {
				panic(err)
			}
			Src := lilliput.NewFramebuffer(s.X, s.Y)
			_ = Decoder.DecodeTo(Src)
			Decoder.Close()

			// Decode the destination.
			buf = bytes.Buffer{}
			err = enc.Encode(&buf, ImageEdit)
			if err != nil {
				panic(err)
			}
			Decoder, err = lilliput.NewDecoder(buf.Bytes())
			if err != nil {
				panic(err)
			}
			s = ImageEdit.Bounds().Size()
			Dest := lilliput.NewFramebuffer(s.X, s.Y)
			_ = Decoder.DecodeTo(Dest)

			// Do picture in picture with the src.
			Dest.PictureInPicture(Src, Rect.Min.X, Rect.Min.Y)
			Src.Close()

			// Push it back to where it was.
			x := make([]byte, 50*1024*1024)
			Encoder, err := lilliput.NewEncoder(".png", Decoder, x)
			if err != nil {
				panic(err)
			}
			Encoder.Encode(Dest, map[int]int{lilliput.PngCompression: 0})
			Dest.Close()
			Encoder.Close()
			Decoder.Close()
			i, err := png.Decode(bytes.NewReader(x))
			if err != nil {
				panic(err)
			}
			ImageEdit = i.(*img.RGBA)
		}

		// Handles the drawing of the crosshair on the screen.
		Height := b.Dy()
		Width := b.Dx()
		WidthHeightComplete := 0
		PixelOffset := ImageEdit.PixOffset(DisplayPoint.X, 0)
		for WidthHeightComplete != Height {
			go func(offset int) {
				ImageEdit.Pix[offset+1] = 255 // R
				ImageEdit.Pix[offset+2] = 255 // G
				ImageEdit.Pix[offset+3] = 255 // B
				ImageEdit.Pix[offset+4] = 255 // A
			}(PixelOffset)
			PixelOffset = ImageEdit.PixOffset(DisplayPoint.X, WidthHeightComplete)
			WidthHeightComplete++
		}
		WidthHeightComplete = 0
		PixelOffset = ImageEdit.PixOffset(0, DisplayPoint.Y)
		for WidthHeightComplete != Width {
			go func(offset int) {
				ImageEdit.Pix[offset+1] = 255 // R
				ImageEdit.Pix[offset+2] = 255 // G
				ImageEdit.Pix[offset+3] = 255 // B
				ImageEdit.Pix[offset+4] = 255 // A
			}(PixelOffset)
			PixelOffset = ImageEdit.PixOffset(WidthHeightComplete, DisplayPoint.Y)
			WidthHeightComplete++
		}
	}

	// Returns the image.
	return ImageEdit
}
