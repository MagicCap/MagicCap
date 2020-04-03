package regionselector

import (
	"github.com/magiccap/MagicCap/core/editors"
	"image"
	"strconv"
	"sync"

	"github.com/MagicCap/glhf"
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
	RawX int, RawY int, SelectedKey string, ShowEditors bool,
	History []*edit,
) (*glhf.Texture, string) {
	// Create a copy of "DarkerTexture".
	DarkerTexture.Begin()
	Width := DarkerTexture.Width()
	Height := DarkerTexture.Height()
	RenderedTexture := glhf.NewTexture(Width, Height, true, DarkerTexture.Pixels(0, 0, Width, Height))
	DarkerTexture.End()

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
				NormalTexture.Begin()
				Pixels := NormalTexture.Pixels(Left, Top, w, h)
				NormalTexture.End()
				if len(Pixels) == 0 {
					// In this season of "Why the fuck is this a bug?"
					return RenderedTexture, HoveringEditor
				}
				RenderedTexture.SetPixels(Left, Top, w, h, Pixels)

				// HACK: Redraw the history. There's definitely a more elegant way of doing this.
				// But eh, it'd be a tiny performance improvement.
				for _, v := range History {
					RenderedTexture.SetPixels(v.p.X, v.p.Y, v.r.Rect.Dx(), v.r.Rect.Dy(), v.r.Pix)
				}

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

		// Draw the X/Y font texture.
		if ShowXY {
			DisplayString := "X: " + strconv.Itoa(RawX) + " | Y: " + strconv.Itoa(RawY)
			FontImg := RenderText(DisplayString, 20)
			RenderedTexture.SetPixels(DisplayPoint.X+10, DisplayPoint.Y+10, FontImg.Bounds().Dx(), FontImg.Bounds().Dy(), FontImg.Pix)
		}
	}

	// End the rendered texture modifications.
	RenderedTexture.End()

	// Return the rendered texture and hovering editor.
	return RenderedTexture, HoveringEditor
}
