package core

import (
	"errors"
	"github.com/disintegration/imaging"
	"github.com/faiface/glhf"
	"github.com/go-gl/glfw/v3.3/glfw"
	"github.com/go-vgo/robotgo"
	"github.com/kbinani/screenshot"
	img "image"
	"image/color"
	"sync"
	"time"
)

// VertexShader is the vertex shader which is used by this render.
var VertexShader = `
#version 330 core

in vec2 position;
in vec2 texture;

out vec2 Texture;

void main() {
	gl_Position = vec4(position, 0.0, 1.0);
	Texture = texture;
}
`

// FragmentShader is the fragment shader which is used by this render.
var FragmentShader = `
#version 330 core

in vec2 Texture;

out vec4 color;

uniform sampler2D tex;

void main() {
	color = texture(tex, Texture);
}`

// HandleWindow is used to handle a window.
func HandleWindow(image *img.NRGBA, DisplayPoint *img.Point) {
	// Creates the shader.
	shader, err := glhf.NewShader(glhf.AttrFormat{
		{Name: "position", Type: glhf.Vec2},
		{Name: "texture", Type: glhf.Vec2},
	}, glhf.AttrFormat{}, VertexShader, FragmentShader)
	if err != nil {
		panic(err)
	}

	ImageEdit := image
	if DisplayPoint != nil {
		// Copy the image.
		b := ImageEdit.Bounds()
		ImageCpy := img.NewNRGBA(b)
		for i, v := range ImageEdit.Pix {
			ImageCpy.Pix[i] = v
		}
		ImageEdit = ImageCpy

		// Plots the co-ordinates.
		Height := b.Dy()
		Width := b.Dx()
		XCords := []int{DisplayPoint.X}
		if DisplayPoint.X - 1 >= 0 {
			XCords = append(XCords, DisplayPoint.X - 1)
		}
		if b.Max.X >= DisplayPoint.X + 1 {
			XCords = append(XCords, DisplayPoint.X + 1)
		}
		YCords := []int{DisplayPoint.Y}
		if DisplayPoint.Y - 1 >= 0 {
			YCords = append(YCords, DisplayPoint.Y - 1)
		}
		if b.Max.Y >= DisplayPoint.Y + 1 {
			YCords = append(YCords, DisplayPoint.Y + 1)
		}
		Points := make([]*img.Point, (len(XCords) * Height) + (len(YCords) * Width))
		i := 0
		for _, x := range XCords {
			HeightComplete := 0
			for HeightComplete != Height {
				Points[i] = &img.Point{
					X: x,
					Y: HeightComplete,
				}
				i++
				HeightComplete++
			}
		}
		for _, y := range YCords {
			WidthComplete := 0
			for WidthComplete != Width {
				Points[i] = &img.Point{
					X: WidthComplete,
					Y: y,
				}
				i++
				WidthComplete++
			}
		}

		// Manipulate the image to add the crosshair.
		// This is not thread safe sadly.
		for _, v := range Points {
			ImageEdit.Set(v.X, v.Y, color.White)
		}
	}

	// Creates the texture.
	texture := glhf.NewTexture(
		image.Bounds().Dx(),
		image.Bounds().Dy(),
		true,
		ImageEdit.Pix,
	)

	// Create the vertex slice.
	slice := glhf.MakeVertexSlice(shader, 6, 6)
	slice.Begin()
	slice.SetVertexData([]float32{
		-1, -1, 0, 1,
		+1, -1, 1, 1,
		+1, +1, 1, 0,

		-1, -1, 0, 1,
		+1, +1, 1, 0,
		-1, +1, 0, 0,
	})
	slice.End()

	// Clear the window.
	glhf.Clear(1, 1, 1, 1)

	// Render everything.
	shader.Begin()
	texture.Begin()
	slice.Begin()
	slice.Draw()
	slice.End()
	texture.End()
	shader.End()
}

// OpenRegionSelector is used to open a native OpenGL region selector (I know OpenGL is painful to write, kill me).
func OpenRegionSelector() {
	// Gets all of the displays.
	Displays := GetActiveDisplaysOrdered()

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

	// Make a window on each display.
	Windows := make([]*glfw.Window, len(GLFWMonitors))
	for i, v := range Displays {
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
	}

	// Ensures the windows stay open.
	for {
		// Gets the mouse position.
		x, y := robotgo.GetMousePos()

		ShouldBreakOuter := false
		for i, Window := range Windows {
			// Makes the window the current context.
			if Window.ShouldClose() {
				ShouldBreakOuter = true
				break
			}
			Window.MakeContextCurrent()

			// Gets the point relative to the display.
			// If DisplayPoint is nil, the point is not on this display.
			Rect := Displays[i]
			var DisplayPoint *img.Point
			if x >= Rect.Min.X && Rect.Max.X >= x && y >= Rect.Min.Y && Rect.Max.Y >= y {
				DisplayPoint = &img.Point{
					X: x - Rect.Min.X,
					Y: y - Rect.Min.Y,
				}
			}

			// Handles the window.
			HandleWindow(DarkerScreenshots[i], DisplayPoint)

			// Draws the buffer.
			Window.SwapBuffers()
		}

		// Handles the outer for loop and polls for events.
		if ShouldBreakOuter {
			break
		}
		glfw.PollEvents()

		// Sleep for 1/60th of a second (therefore locking this to 60fps).
		time.Sleep(time.Second / 60)
	}
}
