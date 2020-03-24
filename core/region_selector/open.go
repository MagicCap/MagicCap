package regionselector

import (
	"errors"
	"github.com/magiccap/MagicCap/core/editors"
	"github.com/magiccap/MagicCap/core/mainthread"
	img "image"
	"image/draw"
	"sync"

	"github.com/disintegration/imaging"
	"github.com/faiface/glhf"
	"github.com/getsentry/sentry-go"
	"github.com/go-gl/glfw/v3.3/glfw"
	"github.com/go-vgo/robotgo"
	"github.com/kbinani/screenshot"
	displaymanagement "github.com/magiccap/MagicCap/core/display_management"
	_ "github.com/magiccap/MagicCap/core/editors"
)

type edit struct {
	p *img.Point
	r *img.RGBA
}

// OpenRegionSelector is used to open a native OpenGL region selector (I know OpenGL is painful to write, kill me).
func OpenRegionSelector(ShowEditors bool) *SelectorResult {
	// Gets all of the displays.
	Displays := displaymanagement.GetActiveDisplaysOrdered()

	// Multi-thread getting all of the displays and making all of the images darker.
	ScreenshotLen := 0
	Screenshots := make([]*img.RGBA, len(Displays))
	DarkerScreenshots := make([]*img.RGBA, len(Displays))
	ScreenshotsLock := sync.Mutex{}
	wg := sync.WaitGroup{}
	wg.Add(len(Displays))
	for i, v := range Displays {
		go func(index int, rect img.Rectangle) {
			// Takes the screenshot.
			Screenshot, err := screenshot.CaptureRect(rect)
			if err != nil {
				sentry.CaptureException(err)
				panic(err)
			}

			// Creates a darker version of the screenshot.
			Darker := imaging.AdjustBrightness(Screenshot, -15)

			// Locks the screenshot lock.
			ScreenshotsLock.Lock()

			// Adds the screenshots to the arrays.
			Screenshots[index] = Screenshot
			i := img.NewRGBA(Darker.Rect)
			draw.Draw(i, i.Rect, Darker, img.Point{X: 0, Y: 0}, draw.Over)
			DarkerScreenshots[index] = i

			// Adds one to the screenshot length.
			ScreenshotLen++

			// Unlocks the screenshot lock.
			ScreenshotsLock.Unlock()

			// Sets this task to done.
			wg.Done()
		}(i, v)
	}
	wg.Wait()

	// Remap the monitors to the order of the "Displays" array.
	var GLFWMonitorsUnordered []*glfw.Monitor
	mainthread.ExecMainThread(func() {
		GLFWMonitorsUnordered = glfw.GetMonitors()
	})
	GLFWMonitors := make([]*glfw.Monitor, len(GLFWMonitorsUnordered))
	for _, Monitor := range GLFWMonitorsUnordered {
		x, y := Monitor.GetPos()
		Matches := false
		for i, v := range Displays {
			if v.Bounds().Min.X == x && v.Bounds().Min.Y == y {
				// This is the correct display.
				GLFWMonitors[i] = Monitor
				Matches = true
				break
			}
		}
		if !Matches {
			panic(errors.New("cannot find matching glfw display"))
		}
	}

	// Defines the shaders.
	Shaders := make([]*glhf.Shader, len(GLFWMonitors))

	// Defines the textures.
	DarkerTextures := make([]*glhf.Texture, len(GLFWMonitors))
	NormalTextures := make([]*glhf.Texture, len(GLFWMonitors))

	// Defines first positions for the region selector.
	FirstPosMap := map[int]*img.Point{}

	// Creates the event dispatcher.
	dispatcher := EventDispatcher{
		History: map[int][]*edit{},
	}

	// Defines the currently selected editor.
	SelectedEditor := "__selector"

	// Defines the hovering editor.
	// A blank string means it isn't hovering.
	HoveringEditor := ""

	// Make a window on each display.
	Windows := make([]*glfw.Window, len(GLFWMonitors))
	for i, v := range Displays {
		// TODO: Create shortcut so CTRLOrCMD+Z can work.

		// Creates the window.
		var Window *glfw.Window
		var err error
		mainthread.ExecMainThread(func() {
			glfw.WindowHint(glfw.ContextVersionMajor, 3)
			glfw.WindowHint(glfw.ContextVersionMinor, 3)
			glfw.WindowHint(glfw.OpenGLProfile, glfw.OpenGLCoreProfile)
			glfw.WindowHint(glfw.OpenGLForwardCompatible, glfw.True)
			glfw.WindowHint(glfw.Resizable, glfw.False)
			glfw.WindowHint(glfw.Focused, glfw.True)
			glfw.WindowHint(glfw.Decorated, glfw.False)
			glfw.WindowHint(glfw.Floating, glfw.True)
			glfw.WindowHint(glfw.Maximized, glfw.True)
			glfw.WindowHint(glfw.FocusOnShow, glfw.True)
			Window, err = glfw.CreateWindow(v.Max.X-v.Min.X, v.Max.Y-v.Min.Y, "MagicCap Region Selector", GLFWMonitors[i], nil)
			if err != nil {
				sentry.CaptureException(err)
				panic(err)
			}
			Windows[i] = Window
			Window.MakeContextCurrent()
		})

		// Sets the mouse button handler.
		index := i
		DisplayPos := v
		Window.SetMouseButtonCallback(func(_ *glfw.Window, button glfw.MouseButton, action glfw.Action, _ glfw.ModifierKey) {
			if button != glfw.MouseButton1 {
				return
			}
			x, y := robotgo.GetMousePos()
			if action == glfw.Press {
				if HoveringEditor != "" {
					// Ignore this! This is in the editor.
					return
				}
				FirstPosMap[index] = &img.Point{
					X: x - DisplayPos.Min.X,
					Y: y - DisplayPos.Min.Y,
				}
				dispatcher.EscapeHandler = func() {
					FirstPosMap[index] = nil
				}
			} else if action == glfw.Release {
				if HoveringEditor != "" {
					// Handle selecting a editor.
					SelectedEditor = HoveringEditor
					return
				}

				FirstPosCpy, ok := FirstPosMap[index]
				if !ok {
					// Ignore this!
					return
				}
				FirstPosMap[index] = nil
				if FirstPosCpy != nil {
					// Get the result from here.
					EndResult := &img.Point{
						X: x - DisplayPos.Min.X,
						Y: y - DisplayPos.Min.Y,
					}

					// Get the rectangle.
					Rect := img.Rect(FirstPosCpy.X, FirstPosCpy.Y, EndResult.X, EndResult.Y)

					// Nil the escape handler.
					dispatcher.EscapeHandler = nil

					if SelectedEditor == "__selector" {
						// Apply all edits for this display.
						Edits, _ := dispatcher.History[index]
						for _, v := range Edits {
							// Get the screenshot.
							s := Screenshots[index]

							// Draws the edit.
							x := 0
							for x != v.r.Rect.Dx() {
								y := 0
								for y != v.r.Rect.Dy() {
									s.Set(x+v.p.X, y+v.p.Y, v.r.At(x, y))
									y++
								}
								x++
							}
						}

						// Sets the result.
						dispatcher.Result = &SelectorResult{
							Selection:      Screenshots[index].SubImage(Rect).(*img.RGBA),
							Screenshots:    Screenshots,
							Displays:       Displays,
							DisplayIndex:   index,
							TopLeftDisplay: &Rect.Min,
						}

						// Closes the window.
						Window.SetShouldClose(true)
					} else {
						// Get the selection.
						Selection := Screenshots[index].SubImage(Rect).(*img.RGBA)

						// Run the editor.
						// TODO: Don't hardcode RGBA values.
						Result := editors.Editors[SelectedEditor].Apply(Selection, [3]uint8{255, 255, 255})
						h, ok := dispatcher.History[index]
						if ok {
							dispatcher.History[index] = append(h, &edit{
								p: &Rect.Min,
								r: Result,
							})
						} else {
							dispatcher.History[index] = []*edit{{
								p: &Rect.Min,
								r: Result,
							}}
						}
					}
				}
			}
		})

		// Sets the key handler.
		KeysDown := make([]*glfw.Key, 0)
		KeysDownLock := sync.RWMutex{}
		KeysReleased := 0
		KeysReleasedLock := sync.Mutex{}
		Window.SetKeyCallback(func(w *glfw.Window, key glfw.Key, _ int, action glfw.Action, _ glfw.ModifierKey) {
			if action != glfw.Release {
				// Log this key as down and return.
				KeysDownLock.RLock()
				KeysDown = append(KeysDown, &key)
				KeysDownLock.RUnlock()
				return
			}

			for _, v := range KeysDown {
				if *v == key {
					// Lock the keys released.
					KeysReleasedLock.Lock()

					// Set this key as released and get the released count.
					KeysReleased++
					ReleasedCount := KeysReleased

					// Check if all the keys are released. If they are, call the key down function.
					KeysDownLock.RLock()
					if ReleasedCount == len(KeysDown) {
						KeysDownLock.RUnlock()
						ReleasedCount = 0
						KeysDownLock.Lock()
						KeyUpHandler(w, KeysDown, &dispatcher)
						KeysDown = make([]*glfw.Key, 0)
						KeysDownLock.Unlock()
					} else {
						KeysDownLock.RUnlock()
					}

					// Unlock the keys released lock.
					KeysReleasedLock.Unlock()

					// Break out of this loop.
					break
				}
			}
		})

		// Creates the shader.
		mainthread.ExecMainThread(func() {
			s, err := glhf.NewShader(glhf.AttrFormat{
				{Name: "position", Type: glhf.Vec2},
				{Name: "texture", Type: glhf.Vec2},
			}, glhf.AttrFormat{}, VertexShader, FragmentShader)
			if err != nil {
				panic(err)
			}
			Shaders[i] = s

			// Creates the texture.
			DarkerTextures[i] = glhf.NewTexture(
				DarkerScreenshots[i].Bounds().Dx(),
				DarkerScreenshots[i].Bounds().Dy(),
				true,
				DarkerScreenshots[i].Pix,
			)

			// Creates the brighter texture.
			NormalTextures[i] = glhf.NewTexture(
				Screenshots[i].Bounds().Dx(),
				Screenshots[i].Bounds().Dy(),
				true,
				Screenshots[i].Pix,
			)
		})
	}

	// Handles events in the window.
	FirstTick := true
	LastMouseDisplay := -1
	for {
		// Gets the mouse position.
		x, y := robotgo.GetMousePos()

		// Defines if the mouse moved displays during the process.
		MouseMovedDisplay := false
		for i, Rect := range Displays {
			if x >= Rect.Min.X && Rect.Max.X >= x && y >= Rect.Min.Y && Rect.Max.Y >= y {
				if LastMouseDisplay != i {
					// The last display the mouse was on was not i.
					// This means that the mouse moved display.
					// We do this in another loop so that we can enforce it across all displays in the loop below.
					LastMouseDisplay = i
					MouseMovedDisplay = true
				}
				break
			}
		}

		ShouldBreakOuter := false
		for i, Window := range Windows {
			// Get the rectangle for this display.
			Rect := Displays[i]

			// Gets the point relative to the display.
			// If DisplayPoint is nil, the point is not on this display.
			var DisplayPoint *img.Point
			if LastMouseDisplay == i {
				DisplayPoint = &img.Point{
					X: x - Rect.Min.X,
					Y: y - Rect.Min.Y,
				}
			}

			BreakHere := false
			ContinueHere := false
			mainthread.ExecMainThread(func() {
				// Makes the window the current context.
				if Window.ShouldClose() {
					ShouldBreakOuter = true
					BreakHere = true
					return
				}

				// Don't bother drawing if this is not the current display.
				if DisplayPoint == nil && !FirstTick && !MouseMovedDisplay {
					ContinueHere = true
					return
				}

				// Make this window the current context.
				Window.MakeContextCurrent()

				// Handles the window.
				Texture, h := RenderDisplay(DisplayPoint, FirstPosMap[i], NormalTextures[i], DarkerTextures[i], x, y, SelectedEditor, ShowEditors, dispatcher.History[i])
				HoveringEditor = h
				HandleWindow(Shaders[i], Texture)
			})

			if BreakHere {
				break
			} else if ContinueHere {
				continue
			}

			// Draws the buffer.
			go Window.SwapBuffers()
		}

		// Handles the outer for loop and polls for events.
		mainthread.ExecMainThread(glfw.PollEvents)
		if ShouldBreakOuter {
			break
		}

		// Ensure FirstTick is false.
		FirstTick = false
	}

	// Cleans up the windows.
	mainthread.ExecMainThread(func() {
		for _, v := range Windows {
			v.MakeContextCurrent()
			v.Destroy()
		}
	})

	// Handles the "F" key being pressed.
	if dispatcher.ShouldFullscreenCapture {
		Display := 0
		x, y := robotgo.GetMousePos()
		for i, Rect := range Displays {
			if x >= Rect.Min.X && Rect.Max.X >= x && y >= Rect.Min.Y && Rect.Max.Y >= y {
				Display = i
				break
			}
		}
		Screenshot := Screenshots[Display]
		return &SelectorResult{
			Selection:    Screenshot,
			Screenshots:  Screenshots,
			Displays:     Displays,
			DisplayIndex: Display,
			TopLeftDisplay: &img.Point{
				X: 0,
				Y: 0,
			},
		}
	}

	// if Result isn't null, return it.
	if dispatcher.Result != nil {
		return dispatcher.Result
	}

	// Return null.
	return nil
}
