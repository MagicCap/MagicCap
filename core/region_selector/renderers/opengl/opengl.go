package opengl

import (
	"github.com/MagicCap/glhf"
	"github.com/getsentry/sentry-go"
	"github.com/go-gl/gl/v3.3-core/gl"
	"github.com/go-gl/glfw/v3.3/glfw"
	"github.com/kbinani/screenshot"
	"github.com/magiccap/MagicCap/core/mainthread"
	"github.com/magiccap/MagicCap/core/region_selector/renderers/types"
	"image"
	"runtime"
)

// This is used to define a RGBA image.
type rgbaImage struct {
	data []byte
	w, h int
}

// This is used to define the OpenGL renderer.
type OpenGLRenderer struct {
	glfwMonitors   []*glfw.Monitor
	displays       []image.Rectangle
	mousePressCb   func(index int, pos image.Rectangle)
	mouseReleaseCb func(index int, pos image.Rectangle)
	windows        []*glfw.Window
	keyCb          func(Release bool, Index, Key int)
	darkerTextures []*rgbaImage
	normalTextures []*glhf.Texture
	shaders        []*glhf.Shader
	slices		   []*glhf.VertexSlice
}

// ShouldClose is used to say windows should close.
func (r *OpenGLRenderer) ShouldClose() {
	r.windows[0].SetShouldClose(true)
}

// WindowShouldClose is used to check if a window should close.
func (r *OpenGLRenderer) WindowShouldClose(index int) bool {
	return r.windows[index].ShouldClose()
}

// DestroyAll is used to destroy all of the windows.
func (r *OpenGLRenderer) DestroyAll() {
	mainthread.ExecMainThread(func() {
		for _, v := range r.windows {
			v.MakeContextCurrent()
			v.Destroy()
		}
		for _, v := range r.normalTextures {
			v.Delete()
		}
		for _, v := range r.shaders {
			v.Delete()
		}
		for _, v := range r.slices {
			v.Delete()
		}
	})
}

// SetKeyCallback is used to handle key callbacks.
func (r *OpenGLRenderer) SetKeyCallback(Function func(Release bool, index, key int)) {
	r.keyCb = Function
}

// SetMousePressCallback is used to set a mouse callback for when it is pressed.
func (r *OpenGLRenderer) SetMousePressCallback(Function func(index int, pos image.Rectangle)) {
	r.mousePressCb = Function
}

// SetMouseReleaseCallback is used to set a mouse callback for when it is released.
func (r *OpenGLRenderer) SetMouseReleaseCallback(Function func(index int, pos image.Rectangle)) {
	r.mouseReleaseCb = Function
}

// PollEvents is used to poll for events.
func (r *OpenGLRenderer) PollEvents() {
	mainthread.ExecMainThread(glfw.PollEvents)
}

// Get the display rectangles.
func (r *OpenGLRenderer) getRectangles() []image.Rectangle {
	displays := make([]image.Rectangle, len(r.glfwMonitors))
	for i, v := range r.glfwMonitors {
		x, y := v.GetPos()
		sq := screenshot.GetDisplayBounds(i)
		displays[i] = image.Rect(x, y, x + sq.Dx(), y + sq.Dy())
	}
	return displays
}

// GetDisplayRectangles is used to get the display rectangles.
func (r *OpenGLRenderer) GetDisplayRectangles() []image.Rectangle {
	x := make([]image.Rectangle, len(r.displays))
	for i, v := range r.displays {
		x[i] = v
	}
	return x
}

// Init is used to initialise the renderer.
func (r *OpenGLRenderer) Init(DarkerScreenshots, Screenshots []*image.RGBA) {
	// Remap the monitors to the order of the "displays" array.
	mainthread.ExecMainThread(func() {
		r.glfwMonitors = glfw.GetMonitors()
	})

	// Get the display rectangles.
	r.displays = r.getRectangles()

	// Defines all needed OpenGL definitions.
	r.shaders = make([]*glhf.Shader, len(r.glfwMonitors))
	r.slices = make([]*glhf.VertexSlice, len(r.glfwMonitors))
	r.darkerTextures = make([]*rgbaImage, len(r.glfwMonitors))
	r.normalTextures = make([]*glhf.Texture, len(r.glfwMonitors))

	// Make a window on each display.
	r.windows = make([]*glfw.Window, len(r.glfwMonitors))
	var FirstWindow *glfw.Window
	mainthread.ExecMainThread(func() {
		for i, v := range r.displays {
			// Creates the window.
			var Window *glfw.Window
			var err error

			// Creates the OpenGL context.
			glfw.WindowHint(glfw.ContextVersionMajor, 3)
			glfw.WindowHint(glfw.ContextVersionMinor, 3)
			glfw.WindowHint(glfw.OpenGLProfile, glfw.OpenGLCoreProfile)
			glfw.WindowHint(glfw.OpenGLForwardCompatible, glfw.True)

			// Sets all of the used window hints.
			glfw.WindowHint(glfw.CenterCursor, glfw.False)
			glfw.WindowHint(glfw.Decorated, glfw.False)
			glfw.WindowHint(glfw.FocusOnShow, glfw.True)
			glfw.WindowHint(glfw.Floating, glfw.True)
			glfw.WindowHint(glfw.AutoIconify, glfw.False)
			glfw.WindowHint(glfw.Resizable, glfw.False)

			// Create the display window.
			monitor := r.glfwMonitors[i]
			if runtime.GOOS == "linux" {
				// Apparently Linux tries to do shit with decorations if the monitor isn't nil and the window is visible.
				// FFS.
				monitor = nil
			}
			width := v.Max.X-v.Min.X
			height := v.Max.Y-v.Min.Y
			Window, err = glfw.CreateWindow(width, height, "MagicCap Region Selector", monitor, FirstWindow)
			if err != nil {
				sentry.CaptureException(err)
				panic(err)
			}
			if FirstWindow == nil {
				FirstWindow = Window
			}
			r.windows[i] = Window
			Window.MakeContextCurrent()
			if runtime.GOOS == "linux" {
				// Set the monitor on Linux.

				// Get the refresh rate first. This stops the screen going black with some GPU's.
				refreshRate := r.glfwMonitors[i].GetVideoMode().RefreshRate

				// Set the monitor.
				Window.SetMonitor(r.glfwMonitors[i], 0, 0, width, height, refreshRate)
			}

			// Remember these for later.
			index := i
			DisplayPos := v

			// Sets the mouse button handler.
			Window.SetMouseButtonCallback(func(_ *glfw.Window, button glfw.MouseButton, action glfw.Action, _ glfw.ModifierKey) {
				if button != glfw.MouseButton1 {
					return
				}

				if action == glfw.Press {
					if r.mousePressCb != nil {
						r.mousePressCb(index, DisplayPos)
					}
				} else if action == glfw.Release {
					if r.mouseReleaseCb != nil {
						r.mouseReleaseCb(index, DisplayPos)
					}
				}
			})

			// Sets the key handler.
			Window.SetKeyCallback(func(_ *glfw.Window, key glfw.Key, _ int, action glfw.Action, _ glfw.ModifierKey) {
				if r.keyCb != nil {
					r.keyCb(action == glfw.Release, index, int(key))
				}
			})

			// Creates all required OpenGL definitions.
			s, err := glhf.NewShader(glhf.AttrFormat{
				{Name: "position", Type: glhf.Vec2},
				{Name: "texture", Type: glhf.Vec2},
			}, glhf.AttrFormat{}, vertexShader, fragmentShader)
			if err != nil {
				panic(err)
			}
			r.shaders[i] = s
			slice := glhf.MakeVertexSlice(s, 6, 6)
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
			r.slices[i] = slice

			// Creates the texture.
			r.darkerTextures[i] = &rgbaImage{
				data: DarkerScreenshots[i].Pix,
				w:    DarkerScreenshots[i].Bounds().Dx(),
				h:    DarkerScreenshots[i].Bounds().Dy(),
			}

			// Creates the brighter texture.
			t := glhf.NewTexture(
				Screenshots[i].Bounds().Dx(),
				Screenshots[i].Bounds().Dy(),
				true,
				Screenshots[i].Pix,
			)
			r.normalTextures[i] = t
		}
	})
}

type openGlTexture struct {
	texture *glhf.Texture
}

// Begin defines the start of texture modifications.
func (t *openGlTexture) Begin() {
	mainthread.ExecMainThread(t.texture.Begin)
}

// End defines the end of texture modifications.
func (t *openGlTexture) End() {
	mainthread.ExecMainThread(t.texture.End)
}

// SetPixels is used to set the pixels.
func (t *openGlTexture) SetPixels(X, Y, Width, Height int, Pix []byte) {
	mainthread.ExecMainThread(func() {
		t.texture.SetPixels(X, Y, Width, Height, Pix)
	})
}

// GetWidthHeight is used to get the width/height.
func (t *openGlTexture) GetWidthHeight() (int, int) {
	var w int
	var h int
	mainthread.ExecMainThread(func() {
		w = t.texture.Width()
		h = t.texture.Height()
	})
	return w, h
}

// GetDarkerTexture is used to get the darker texture.
func (r *OpenGLRenderer) GetDarkerTexture(index int) types.Texture {
	var x *glhf.Texture
	mainthread.ExecMainThread(func() {
		t := r.darkerTextures[index]
		x = glhf.NewTexture(t.w, t.h, true, t.data)
		runtime.GC()
	})
	return &openGlTexture{texture: x}
}

// GetNormalTexturePixels is used to get the normal texture pixels.
func (r *OpenGLRenderer) GetNormalTexturePixels(index, Left, Top, W, H int) []uint8 {
	var x []uint8
	mainthread.ExecMainThread(func() {
		defer func() {
			// If it panics here, we should return an array the size it's expecting.
			// This isn't ideal, but it shouldn't happen much (maybe 1 or 2 times before it syncs) so it's not a huge deal.
			if recover() != nil {
				x = make([]uint8, (W*H)*4)
			}
		}()
		t := r.normalTextures[index]
		t.Begin()
		x = t.Pixels(Left, Top, W, H)
		t.End()
		runtime.GC()
	})
	return x
}

// RenderTexture is used to render a texture to the screen.
func (r *OpenGLRenderer) RenderTexture(index int, t types.Texture) {
	glt := t.(*openGlTexture).texture
	mainthread.ExecMainThread(func() {
		// Get the window.
		window := r.windows[index]

		// Set the focus of the window.
		window.MakeContextCurrent()

		// Clear the window.
		glhf.Clear(1, 1, 1, 1)

		// Get the shader.
		shader := r.shaders[index]

		// Get the slice.
		slice := r.slices[index]

		// Render everything.
		shader.Begin()
		glt.Begin()
		slice.Begin()
		slice.Draw()
		slice.End()
		shader.End()
		glt.End()

		// Swap the buffer.
		window.SwapBuffers()

		// Run GC.
		runtime.GC()
	})
}

// RendererInit is used to initialise the renderer.
func (OpenGLRenderer) RendererInit() {
	err := glfw.Init()
	if err != nil {
		panic(err)
	}
	err = gl.Init()
	if err != nil {
		panic(err)
	}
}
