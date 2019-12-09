package core

import (
	"errors"
	"github.com/disintegration/imaging"
	"github.com/go-gl/gl/v2.1/gl"
	"github.com/go-gl/glfw/v3.3/glfw"
	"github.com/kbinani/screenshot"
	"image"
	"sync"
	"unsafe"
)

// Texture is the struct used to contain a texture to be rendered.
type Texture struct {
	handle uint32
	target uint32
	texUnit uint32
}

// Bind is used to bind a OpenGL texture.
func (tex *Texture) Bind(texUnit uint32) {
	gl.ActiveTexture(texUnit)
	gl.BindTexture(tex.target, tex.handle)
	tex.texUnit = texUnit
}

// UnBind is used to unbind a OpenGL texture.
func (tex *Texture) UnBind() {
	tex.texUnit = 0
	gl.BindTexture(tex.target, 0)
}

// RenderBackground is used to render the background.
func RenderBackground(nrgba *image.NRGBA) (*Texture, error) {
	gl.Enable(gl.TEXTURE_2D)
	var handle uint32
	gl.GenTextures(1, &handle)

	target      := uint32(gl.TEXTURE_2D)
	internalFmt := int32(gl.SRGB_ALPHA)
	format      := uint32(gl.RGBA)
	width       := int32(nrgba.Rect.Size().X)
	height      := int32(nrgba.Rect.Size().Y)
	pixType     := uint32(gl.UNSIGNED_BYTE)
	dataPtr     := gl.Ptr(nrgba.Pix)

	texture := Texture{
		handle:handle,
		target:target,
	}
	defer func() {
		texture.texUnit = 0
		gl.BindTexture(texture.target, 0)
	}()

	texture.Bind(gl.TEXTURE0)
	defer texture.UnBind()

	gl.TexParameteri(texture.target, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE)
	gl.TexParameteri(texture.target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
	gl.TexParameteri(texture.target, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
	gl.TexParameteri(texture.target, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

	gl.TexImage2D(target, 0, internalFmt, width, height, 0, format, pixType, dataPtr)

	gl.GenerateMipmap(texture.handle)

	return &texture, nil
}

// OpenRegionSelector is used to open a native OpenGL region selector (I know OpenGL is painful to write, kill me).
func OpenRegionSelector() {
	// Gets all of the displays.
	Displays := GetActiveDisplaysOrdered()

	// Multi-thread getting all of the displays and making all of the images darker.
	Done := make(chan bool)
	ScreenshotLen := 0
	Screenshots := make([]*image.RGBA, len(Displays))
	DarkerScreenshots := make([]*image.NRGBA, len(Displays))
	ScreenshotsLock := sync.Mutex{}
	for i, v := range Displays {
		go func(index int, rect image.Rectangle) {
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
		glfw.WindowHint(glfw.ContextVersionMajor, 2)
		glfw.WindowHint(glfw.ContextVersionMinor, 1)
		Window, err = glfw.CreateWindow(v.Max.X - v.Min.X, v.Max.Y - v.Min.Y, "MagicCap Region Selector", GLFWMonitors[i], nil)
		if err != nil {
			panic(err)
		}
		Windows[i] = Window
	}

	// Ensures the windows stay open.
	for {
		ShouldBreakOuter := false
		for i, Window := range Windows {
			if Window.ShouldClose() {
				ShouldBreakOuter = true
				break
			}
			Window.MakeContextCurrent()
			texture, err := RenderBackground(DarkerScreenshots[i])
			if err != nil {
				panic(err)
			}

			// Gets verticies and indicies.
			Verticies := []float32{
				-1, 1, 0.0,
				1.0, 0.0, 0.0,
				1.0, 0.0,

				1, 1, 0.0,
				0.0, 1.0, 0.0,
				0.0, 0.0,

				1, -1.0, 0.0,
				0.0, 0.0, 1.0,
				0.0, 1.0,

				-1.0, -1.0, 0.0,
				1.0, 1.0, 1.0,
				1.0, 1.0,
			}
			Indicies := []uint32{
				0, 1, 2,
				0, 2, 3,
			}

			// Gets the VAO.
			var VAO uint32
			gl.GenVertexArrays(1, &VAO)
			var VBO uint32
			gl.GenBuffers(1, &VBO)
			var EBO uint32
			gl.GenBuffers(1, &EBO)
			gl.BindVertexArray(VAO)
			gl.BindBuffer(gl.ARRAY_BUFFER, VBO)
			gl.BufferData(gl.ARRAY_BUFFER, len(Verticies)*4, gl.Ptr(Verticies), gl.STATIC_DRAW)
			gl.BindBuffer(gl.ELEMENT_ARRAY_BUFFER, EBO)
			gl.BufferData(gl.ELEMENT_ARRAY_BUFFER, len(Indicies)*4, gl.Ptr(Indicies), gl.STATIC_DRAW)
			stride := int32(3*4 + 3*4 + 2*4)
			offset := 0
			gl.VertexAttribPointer(0, 3, gl.FLOAT, false, stride, gl.PtrOffset(offset))
			gl.EnableVertexAttribArray(0)
			offset += 3*4
			gl.VertexAttribPointer(1, 3, gl.FLOAT, false, stride, gl.PtrOffset(offset))
			gl.EnableVertexAttribArray(1)
			offset += 3*4
			gl.VertexAttribPointer(2, 2, gl.FLOAT, false, stride, gl.PtrOffset(offset))
			gl.EnableVertexAttribArray(2)
			offset += 2*4
			gl.BindVertexArray(0)

			// Handles drawing the background texture.
			texture.Bind(gl.TEXTURE0)
			gl.BindVertexArray(VAO)
			gl.DrawElements(gl.TRIANGLES, 6, gl.UNSIGNED_INT, unsafe.Pointer(nil))
			gl.BindVertexArray(0)
			texture.UnBind()

			// Draws the buffer.
			Window.SwapBuffers()
		}

		// Handles the outer for loop and polls for events.
		if ShouldBreakOuter {
			break
		}
		glfw.PollEvents()
	}
}
