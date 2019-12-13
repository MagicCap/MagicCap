package core

import (
	"errors"
	"github.com/disintegration/imaging"
	"github.com/faiface/glhf"
	"github.com/go-gl/glfw/v3.3/glfw"
	"github.com/go-vgo/robotgo"
	"github.com/kbinani/screenshot"
	img "image"
	"runtime"
	"sync"
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

// DisplayCache is the cache for displays.
var DisplayCache = map[int]*map[*img.Point]*[]byte{}

// DisplayCacheLock is the thread lock for displays.
var DisplayCacheLock = map[int]*sync.RWMutex{}

// GetDisplayImage is used to get the image to show up on the display.
func GetDisplayImage(DisplayPoint *img.Point, image *img.NRGBA, cache *map[*img.Point]*[]byte, CacheLock *sync.RWMutex) *img.NRGBA {
	ImageEdit := image
	if DisplayPoint != nil {
		// If this is cached, return it.
		CacheLock.RLock()
		r := (*cache)[DisplayPoint]
		if r != nil {
			b := ImageEdit.Bounds()
			i := img.NewNRGBA(b)
			i.Pix = *r
			return i
		}
		CacheLock.RUnlock()

		// Copy the image.
		b := ImageEdit.Bounds()
		ImageCpy := img.NewNRGBA(b)
		for i, v := range ImageEdit.Pix {
			ImageCpy.Pix[i] = v
		}
		ImageEdit = ImageCpy

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
				ImageEdit.Pix[offset] = 255   // N
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
				ImageEdit.Pix[offset] = 255   // N
				ImageEdit.Pix[offset+1] = 255 // R
				ImageEdit.Pix[offset+2] = 255 // G
				ImageEdit.Pix[offset+3] = 255 // B
				ImageEdit.Pix[offset+4] = 255 // A
			}(PixelOffset)
			PixelOffset = ImageEdit.PixOffset(WidthComplete, DisplayPoint.Y)
			WidthComplete++
		}
		wg.Wait()

		// Cache the image.
		CacheLock.Lock()
		if len(*cache) >= 3 {
			for i := range *cache {
				delete(*cache, i)
			}
			runtime.GC()
		}
		(*cache)[DisplayPoint] = &ImageCpy.Pix
		CacheLock.Unlock()
	}

	// Returns the image.
	return ImageEdit
}

// HandleWindow is used to handle a window.
func HandleWindow(image *img.NRGBA) {
	// Creates the shader.
	shader, err := glhf.NewShader(glhf.AttrFormat{
		{Name: "position", Type: glhf.Vec2},
		{Name: "texture", Type: glhf.Vec2},
	}, glhf.AttrFormat{}, VertexShader, FragmentShader)
	if err != nil {
		panic(err)
	}

	// Creates the texture.
	texture := glhf.NewTexture(
		image.Bounds().Dx(),
		image.Bounds().Dy(),
		true,
		image.Pix,
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

		// Make the display cache.
		DisplayCache[i] = &map[*img.Point]*[]byte{}
		DisplayCacheLock[i] = &sync.RWMutex{}
	}

	// Ensures the windows stay open.
	for {
		// Gets the mouse position.
		x, y := robotgo.GetMousePos()

		// Handles getting the image in a thread.
		wg := sync.WaitGroup{}
		WindowsLen := len(Windows)
		wg.Add(WindowsLen)
		Images := make([]*img.NRGBA, WindowsLen)
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
				d := GetDisplayImage(DisplayPoint, image, DisplayCache[index], DisplayCacheLock[index])
				Images[index] = d
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

			// Handles the window.
			HandleWindow(Images[i])

			// Draws the buffer.
			go Window.SwapBuffers()
		}

		// Handles the outer for loop and polls for events.
		if ShouldBreakOuter {
			break
		}
		glfw.PollEvents()
	}
}
