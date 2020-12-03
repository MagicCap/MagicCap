package regionselector

import (
	"github.com/magiccap/MagicCap/core/editors"
	"github.com/magiccap/MagicCap/core/region_selector/renderers"
	"image"
	"strconv"
	"sync"
)

func dashedBorder(RenderedTexture renderers.Texture, x, y, w, h int) {
	// Premake the top/bottom bit of the border.
	wt4 := w*4
	TopBottomBorder := make([]uint8, wt4)
	Index := 0
	next := false
	for Index != wt4 {
		if next {
			TopBottomBorder[Index] = 0
			TopBottomBorder[Index+1] = 0
			TopBottomBorder[Index+2] = 0
			TopBottomBorder[Index+3] = 255
		} else {
			TopBottomBorder[Index] = 255
			TopBottomBorder[Index+1] = 255
			TopBottomBorder[Index+2] = 255
			TopBottomBorder[Index+3] = 255
		}
		next = !next
		Index += 4
	}
	RenderedTexture.SetPixels(x, y, w, 1, TopBottomBorder)
	RenderedTexture.SetPixels(x, y+h-1, w, 1, TopBottomBorder)

	// Create the sides of the border.
	next = false
	Index = 0
	if 0 >= h-2 {
		return
	}
	ht4 := (h-2)*4
	if 0 > ht4 {
		ht4 = 0
	}
	SideBorder := make([]uint8, ht4)
	for Index != ht4 {
		if next {
			SideBorder[Index] = 0
			SideBorder[Index+1] = 0
			SideBorder[Index+2] = 0
			SideBorder[Index+3] = 255
		} else {
			SideBorder[Index] = 255
			SideBorder[Index+1] = 255
			SideBorder[Index+2] = 255
			SideBorder[Index+3] = 255
		}
		next = !next
		Index += 4
	}
	RenderedTexture.SetPixels(x, y, 1, h-2, SideBorder)
	RenderedTexture.SetPixels(x+(w-1), y, 1, h-2, SideBorder)
}

// RenderDisplay is used to render the display.
func RenderDisplay(
	DisplayPoint *image.Point, FirstPos *image.Point,
	index int, renderer renderers.Renderer,
	RawX int, RawY int, SelectedKey string, ShowEditors bool,
	History []*edit, MagnifierFrame []byte,
) string {
	// Create a copy of the darker texture.
	RenderedTexture := renderer.GetDarkerTexture(index)

	// Get the width/height.
	Width, Height := RenderedTexture.GetWidthHeight()

	// Being the rendered texture modifications.
	RenderedTexture.Begin()

	// Copy in any history relating to the display.
	for _, v := range History {
		RenderedTexture.SetPixels(v.p.X, v.p.Y, v.r.Rect.Dx(), v.r.Rect.Dy(), v.r.Pix)
	}

	// HoveringEditor is returned with the texture.
	// A blank string suggests that there was no editor which was being hovered over.
	// A non-blank string is the key of a editor.
	HoveringEditor := ""

	// If DisplayPoint is not nil, try drawing the stuff relating to it.
	if DisplayPoint != nil {
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
				Pixels := renderer.GetNormalTexturePixels(index, Left, Top, w, h)
				if len(Pixels) == 0 {
					return HoveringEditor
				}
				RenderedTexture.SetPixels(Left, Top, w, h, Pixels)

				// HACK: Redraw the history. There's definitely a more elegant way of doing this.
				// But eh, it'd be a tiny performance improvement.
				for _, v := range History {
					RenderedTexture.SetPixels(v.p.X, v.p.Y, v.r.Rect.Dx(), v.r.Rect.Dy(), v.r.Pix)
				}

				// Create the dashed border.
				dashedBorder(RenderedTexture, Left, Top, w, h)
			}
		}

		// Draw the X/Y line.
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

		// This only happens if we should be letting the user select a editor.
		ShowXY := true
		if ShowEditors {
			// Draw the top bar.
			RenderedTexture.SetPixels((Width/2)-(editorTopBar.Bounds().Dx()/2), 20, editorTopBar.Bounds().Dx(), editorTopBar.Bounds().Dy(), editorTopBar.Pix)

			// Set the initial offset.
			InitOffset := (Width / 2) - (editorTopBar.Bounds().Dx() / 2)

			// Draw the selected item affect.
			if SelectedKey == "__selector" {
				// The selector is what is currently selected.
				// Ignore the editor iteration.
				RenderedTexture.SetPixels(InitOffset, 20, 100, 50, SelectedItemRender)
			} else {
				// Iterate through all of the keys and add 100 to the start.
				SelectedOffset := InitOffset + 100
				for _, k := range editorsOrdered {
					if k == SelectedKey {
						RenderedTexture.SetPixels(SelectedOffset, 20, 100, 50, SelectedItemRender)
						break
					}
					SelectedOffset += 100
				}
			}

			// Render the description if it's needed.
			if DisplayPoint.Y >= 20 && 70 >= DisplayPoint.Y && DisplayPoint.X >= InitOffset && InitOffset + editorTopBar.Bounds().Dx() >= DisplayPoint.X {
				// Do not show the X/Y.
				ShowXY = false

				// Get X relative to the top bar.
				RelativeX := DisplayPoint.X - InitOffset

				// Try to get the relevant editor.
				Editor := RelativeX / 100
				if len(editorsOrdered) >= Editor {
					// Set the label X position.
					LabelX := InitOffset + (Editor * 100)

					// Set the label Y position.
					LabelY := 75

					// Create the label.
					Description := "The tool used to select what you wish to screenshot."
					if Editor == 0 {
						HoveringEditor = "__selector"
					} else {
						HoveringEditor = editorsOrdered[Editor-1]
						Description = editors.Editors[HoveringEditor].Description
					}
					img := RenderText(Description, 20)
					RenderedTexture.SetPixels(LabelX, LabelY, img.Rect.Dx(), img.Rect.Dy(), img.Pix)
				}
			}

			// Draw the icons.
			IconOffset := InitOffset + 36
			RenderedTexture.SetPixels(IconOffset, 30, preloadedIcons["__selector"].Bounds().Dx(), preloadedIcons["__selector"].Bounds().Dy(), preloadedIcons["__selector"].(*image.NRGBA).Pix)
			IconOffset += 100
			for _, k := range editorsOrdered {
				RenderedTexture.SetPixels(IconOffset, 30, preloadedIcons[k].Bounds().Dx(), preloadedIcons[k].Bounds().Dy(), preloadedIcons[k].(*image.NRGBA).Pix)
				IconOffset += 100
			}
		}

		// Draw the magnifier if there is enough space and it is enabled.
		infoPos := uint8(0)
		if MagnifierFrame != nil {
			f := func() {
				IdealX := Width >= DisplayPoint.X+210
				IdealY := Height >= DisplayPoint.Y+250
				if IdealX && IdealY {
					// This is the ideal condition.
					RenderedTexture.SetPixels(DisplayPoint.X+10, DisplayPoint.Y+50, 200, 200, MagnifierFrame)
				} else {
					// Get the left side Y.
					LeftSideY := DisplayPoint.Y-250

					// If X is ideal, try to handle the Y.
					if IdealX {
						// Try to use the top.
						if LeftSideY > 0 && Height >= LeftSideY {
							RenderedTexture.SetPixels(DisplayPoint.X+10, DisplayPoint.Y-250, 200, 200, MagnifierFrame)
							infoPos = 1
							return
						}
					}

					// Find the ideal X position.
					if IdealY {
						RenderedTexture.SetPixels(DisplayPoint.X-210, DisplayPoint.Y+50, 200, 200, MagnifierFrame)
						infoPos = 2
					} else {
						RenderedTexture.SetPixels(DisplayPoint.X-210, DisplayPoint.Y-250, 200, 200, MagnifierFrame)
						infoPos = 3
					}
				}
			}
			f()
		}

		// Draw the X/Y font texture.
		if ShowXY {
			DisplayString := "X: " + strconv.Itoa(RawX) + " | Y: " + strconv.Itoa(RawY)
			FontImg := RenderText(DisplayString, 20)
			X := FontImg.Bounds().Dx()
			if MagnifierFrame != nil {
				LeftOffset := 100 - (X / 2)
				switch infoPos {
				case 0:
					// Bottom right
					RenderedTexture.SetPixels(DisplayPoint.X+10+LeftOffset, DisplayPoint.Y+10, X, FontImg.Bounds().Dy(), FontImg.Pix)
				case 1:
					// Top right
					RenderedTexture.SetPixels(DisplayPoint.X+10+LeftOffset, DisplayPoint.Y-40, X, FontImg.Bounds().Dy(), FontImg.Pix)
				case 2:
					// Bottom left
					RenderedTexture.SetPixels(DisplayPoint.X-160-LeftOffset, DisplayPoint.Y+10, X, FontImg.Bounds().Dy(), FontImg.Pix)
				case 3:
					// Top left
					RenderedTexture.SetPixels(DisplayPoint.X-160-LeftOffset, DisplayPoint.Y-40, X, FontImg.Bounds().Dy(), FontImg.Pix)
				}
			}
		}
	}

	// End the rendered texture modifications.
	RenderedTexture.End()

	// Apply this texture.
	renderer.RenderTexture(index, RenderedTexture)

	// Return the rendered texture and hovering editor.
	return HoveringEditor
}
