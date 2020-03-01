package regionselector

import (
	"image"
	"sync"

	"github.com/faiface/glhf"
)

func dashedBorder(RenderedTexture *glhf.Texture, x, y, w, h int) {
	// Premake the top/bottom bit of the border.
	TopBottomBorder := make([]uint8, 0, w*4)
	Index := 0
	for Index != w {
		if Index%2 == 0 {
			TopBottomBorder = append(TopBottomBorder, 0, 0, 0, 255)
		} else {
			TopBottomBorder = append(TopBottomBorder, 255, 255, 255, 255)
		}
		Index++
	}

	// Create the rest of the border.
	RenderedTexture.SetPixels(x, y, w, 1, TopBottomBorder)
	RenderedTexture.SetPixels(x, y+h-1, w, 1, TopBottomBorder)
	Index = 0
	y++
	for h-2 >= Index {
		if Index%2 == 0 {
			RenderedTexture.SetPixels(x, y, 1, 1, []uint8{0, 0, 0, 255})
			RenderedTexture.SetPixels(x+w-1, y, 1, 1, []uint8{0, 0, 0, 255})
		} else {
			RenderedTexture.SetPixels(x, y, 1, 1, []uint8{255, 255, 255, 255})
			RenderedTexture.SetPixels(x+w-1, y, 1, 1, []uint8{255, 255, 255, 255})
		}
		y++
		Index++
	}
}

// RenderDisplay is used to render the display.
func RenderDisplay(
	DisplayPoint *image.Point, FirstPos *image.Point,
	NormalTexture *glhf.Texture, DarkerTexture *glhf.Texture,
) *glhf.Texture {
	// Create a copy of "DarkerTexture".
	DarkerTexture.Begin()
	Width := DarkerTexture.Width()
	Height := DarkerTexture.Height()
	RenderedTexture := glhf.NewTexture(Width, Height, true, DarkerTexture.Pixels(0, 0, Width, Height))
	DarkerTexture.End()

	// Being the rendered texture modifications.
	RenderedTexture.Begin()

	// If FirstPos is not nil, try and crop "NormalTexture".
	if FirstPos != nil {
		// Handle the logic behind positioning.
		if DisplayPoint.X != FirstPos.X {
			// Create w/h/Top/Left ignoring that
			Left := FirstPos.X
			if Left > DisplayPoint.X {
				Left = DisplayPoint.X
			}
			w := DisplayPoint.X - FirstPos.X
			if 0 > w {
				w = FirstPos.X - DisplayPoint.X
			}
			h := DisplayPoint.Y - FirstPos.Y
			if 0 > h {
				h = FirstPos.Y - DisplayPoint.Y
			}
			Top := FirstPos.Y
			if Top > DisplayPoint.Y {
				Top = DisplayPoint.Y
			}

			// Write the pixels to the render.
			NormalTexture.Begin()
			Pixels := NormalTexture.Pixels(Left, Top, w, h)
			NormalTexture.End()
			RenderedTexture.SetPixels(Left, Top, w, h, Pixels)
			dashedBorder(RenderedTexture, Left, Top, w, h)
		}
	}

	// If DisplayPoint is not nil, try drawing it.
	if DisplayPoint != nil {
		var XLine []uint8
		var YLine []uint8
		wg := sync.WaitGroup{}
		wg.Add(2)
		go func() {
			defer wg.Done()
			XLine = make([]uint8, Width*4)
			for i := range XLine {
				XLine[i] = 255
			}
		}()
		go func() {
			defer wg.Done()
			YLine = make([]uint8, Height*4)
			for i := range YLine {
				YLine[i] = 255
			}
		}()
		wg.Wait()
		RenderedTexture.SetPixels(0, DisplayPoint.Y, Width, 1, XLine)
		RenderedTexture.SetPixels(DisplayPoint.X, 0, 1, Height, YLine)
	}

	// End the rendered texture modifications.
	RenderedTexture.End()

	// Return the rendered texture.
	return RenderedTexture
}
