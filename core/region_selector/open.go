package regionselector

import (
	"errors"
	img "image"
	"sync"
	"time"

	"github.com/disintegration/imaging"
	"github.com/faiface/glhf"
	"github.com/faiface/mainthread"
	"github.com/getsentry/sentry-go"
	"github.com/go-gl/glfw/v3.3/glfw"
	"github.com/go-vgo/robotgo"
	"github.com/kbinani/screenshot"
	displaymanagement "github.com/magiccap/MagicCap/core/display_management"
	_ "github.com/magiccap/MagicCap/core/editors"
)

// OpenRegionSelector is used to open a native OpenGL region selector (I know OpenGL is painful to write, kill me).
func OpenRegionSelector() *SelectorResult {
	// Gets all of the displays.
	Displays := displaymanagement.GetActiveDisplaysOrdered()

	// Multi-thread getting all of the displays and making all of the images darker.
	ScreenshotLen := 0
	Screenshots := make([]*img.RGBA, len(Displays))
	DarkerScreenshots := make([]*img.NRGBA, len(Displays))
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
			DarkerScreenshots[index] = Darker

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
	mainthread.Call(func() {
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
	Textures := make([]*glhf.Texture, len(GLFWMonitors))

	// Defines first positions for the region selector.
	FirstPosMap := map[int]*img.Point{}

	// Creates the event dispatcher.
	dispatcher := EventDispatcher{}

	// Make a window on each display.
	Windows := make([]*glfw.Window, len(GLFWMonitors))
	for i, v := range Displays {
		// Creates the window.
		var Window *glfw.Window
		var err error
		mainthread.Call(func() {
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
				FirstPosMap[index] = &img.Point{
					X: x - DisplayPos.Min.X,
					Y: y - DisplayPos.Min.Y,
				}
				dispatcher.EscapeHandler = func() {
					FirstPosMap[index] = nil
				}
			} else if action == glfw.Release {
				dispatcher.EscapeHandler = nil
				FirstPosCpy := FirstPosMap[index]
				FirstPosMap[index] = nil
				if FirstPosCpy != nil {
					// Get the result from here.
					EndResult := &img.Point{
						X: x - DisplayPos.Min.X,
						Y: y - DisplayPos.Min.Y,
					}

					// Get the rectangle.
					Rect := img.Rect(FirstPosCpy.X, FirstPosCpy.Y, EndResult.X, EndResult.Y)

					// Gets the result.
					dispatcher.Result = &SelectorResult{
						Selection:      Screenshots[index].SubImage(Rect).(*img.RGBA),
						Screenshots:    Screenshots,
						Displays:       Displays,
						DisplayIndex:   index,
						TopLeftDisplay: &Rect.Min,
					}

					// Closes the window.
					Window.SetShouldClose(true)
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
		mainthread.Call(func() {
			s, err := glhf.NewShader(glhf.AttrFormat{
				{Name: "position", Type: glhf.Vec2},
				{Name: "texture", Type: glhf.Vec2},
			}, glhf.AttrFormat{}, VertexShader, FragmentShader)
			if err != nil {
				panic(err)
			}
			Shaders[i] = s

			// Creates the texture.
			Textures[i] = glhf.NewTexture(
				DarkerScreenshots[i].Bounds().Dx(),
				DarkerScreenshots[i].Bounds().Dy(),
				true,
				DarkerScreenshots[i].Pix,
			)
		})
	}

	// Handles events in the window.
	LastPoint := img.Point{
		X: -9999999999,
		Y: -9999999999,
	}
	for {
		// Gets the mouse position.
		x, y := robotgo.GetMousePos()
		p := img.Point{
			X: x,
			Y: y,
		}
		if LastPoint.Eq(p) {
			time.Sleep(time.Millisecond * 20)
			continue
		}
		LastPoint = p

		// Handles getting the image in a thread.
		wg := sync.WaitGroup{}
		WindowsLen := len(Windows)
		wg.Add(WindowsLen)
		Images := make([]*img.NRGBA, len(GLFWMonitors))
		for i, Rect := range Displays {
			// Gets the point relative to the display.
			// If DisplayPoint is nil, the point is not on this display.
			var DisplayPoint *img.Point
			if x >= Rect.Min.X && Rect.Max.X >= x && y >= Rect.Min.Y && Rect.Max.Y >= y {
				DisplayPoint = &img.Point{
					X: x - Rect.Min.X,
					Y: y - Rect.Min.Y,
				}
			}

			// Gets the image for the display.
			go func(index int, image *img.NRGBA) {
				defer wg.Done()
				Images[index] = GetDisplayImage(DisplayPoint, image, FirstPosMap[index], &p, Screenshots[index])
			}(i, DarkerScreenshots[i])
		}
		wg.Wait()

		ShouldBreakOuter := false
		for i, Window := range Windows {
			BreakHere := false
			mainthread.Call(func() {
				// Makes the window the current context.
				if Window.ShouldClose() {
					ShouldBreakOuter = true
					BreakHere = true
					return
				}
				Window.MakeContextCurrent()

				// Sets the texture.
				texture := Textures[i]
				image := Images[i]
				texture.SetPixels(0, 0, image.Bounds().Dx(), image.Bounds().Dy(), image.Pix)

				// Handles the window.
				HandleWindow(Shaders[i], Textures[i])
			})
			if BreakHere {
				break
			}

			// Draws the buffer.
			go Window.SwapBuffers()
		}

		// Handles the outer for loop and polls for events.
		mainthread.Call(glfw.PollEvents)
		if ShouldBreakOuter {
			break
		}

		// Lock the framerate to 120fps.
		time.Sleep(time.Second / 120)
	}

	// Cleans up the windows.
	mainthread.Call(func() {
		for i, v := range Windows {
			v.MakeContextCurrent()
			Textures[i].End()
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
