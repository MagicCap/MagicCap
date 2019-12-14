package regionselector

import (
	"errors"
	"github.com/MagicCap/MagicCap/core/display_management"
	"github.com/disintegration/imaging"
	"github.com/faiface/glhf"
	"github.com/go-gl/glfw/v3.3/glfw"
	"github.com/go-vgo/robotgo"
	"github.com/kbinani/screenshot"
	img "image"
	"sync"
	"time"
)

// OpenRegionSelector is used to open a native OpenGL region selector (I know OpenGL is painful to write, kill me).
func OpenRegionSelector() {
	// Gets all of the displays.
	Displays := displaymanagement.GetActiveDisplaysOrdered()

	// Multi-thread getting all of the displays and making all of the images darker.
	Done := make(chan bool)
	ScreenshotLen := 0
	Screenshots := make([]*img.RGBA, len(Displays))
	DarkerScreenshots := make([]*img.NRGBA, len(Displays))
	ScreenshotsLock := sync.Mutex{}
	for i, v := range Displays {
		go func(index int, rect img.Rectangle) {
			// Takes the screenshot.
			Screenshot, err := screenshot.CaptureRect(rect)
			if err != nil {
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

			// Defines if we are done.
			DoneByCount := ScreenshotLen == len(Displays)

			// Unlocks the screenshot lock.
			ScreenshotsLock.Unlock()

			// If we are done; handle the channel.
			if DoneByCount {
				Done <- true
			}
		}(i, v)
	}
	<-Done

	// Remap the monitors to the order of the "Displays" array.
	GLFWMonitorsUnordered := glfw.GetMonitors()
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

	// Make a window on each display.
	Windows := make([]*glfw.Window, len(GLFWMonitors))
	for i, v := range Displays {
		// Creates the window.
		var Window *glfw.Window
		var err error
		glfw.WindowHint(glfw.ContextVersionMajor, 3)
		glfw.WindowHint(glfw.ContextVersionMinor, 3)
		glfw.WindowHint(glfw.OpenGLProfile, glfw.OpenGLCoreProfile)
		glfw.WindowHint(glfw.OpenGLForwardCompatible, glfw.True)
		glfw.WindowHint(glfw.Resizable, glfw.False)
		Window, err = glfw.CreateWindow(v.Max.X - v.Min.X, v.Max.Y - v.Min.Y, "MagicCap Region Selector", GLFWMonitors[i], nil)
		if err != nil {
			panic(err)
		}
		Windows[i] = Window
		Window.MakeContextCurrent()

		// Sets the key handler.
		index := i
		KeysDown := make([]*glfw.Key, 0)
		KeysDownLock := sync.RWMutex{}
		KeysReleased := 0
		KeysReleasedLock := sync.Mutex{}
		Window.SetKeyCallback(func(_ *glfw.Window, key glfw.Key, _ int, action glfw.Action, _ glfw.ModifierKey) {
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
						KeyUpHandler(index, KeysDown)
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
	}

	// Ensures the windows stay open.
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
				Images[index] = GetDisplayImage(DisplayPoint, image)
			}(i, DarkerScreenshots[i])
		}
		wg.Wait()

		ShouldBreakOuter := false
		for i, Window := range Windows {
			// Makes the window the current context.
			if Window.ShouldClose() {
				ShouldBreakOuter = true
				break
			}
			Window.MakeContextCurrent()

			// Sets the texture.
			texture := Textures[i]
			image := Images[i]
			texture.SetPixels(0, 0, image.Bounds().Dx(), image.Bounds().Dy(), image.Pix)

			// Handles the window.
			HandleWindow(Shaders[i], Textures[i])

			// Draws the buffer.
			go Window.SwapBuffers()
		}

		// Handles the outer for loop and polls for events.
		if ShouldBreakOuter {
			break
		}
		glfw.PollEvents()

		// Lock the framerate to 120fps.
		time.Sleep(time.Second / 120)
	}
}
