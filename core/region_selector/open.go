package regionselector

import (
	"github.com/getsentry/sentry-go"
	"github.com/go-vgo/robotgo"
	"github.com/kbinani/screenshot"
	"github.com/magiccap/MagicCap/core/editors"
	_ "github.com/magiccap/MagicCap/core/editors"
	"github.com/magiccap/MagicCap/core/magnifier"
	"github.com/magiccap/MagicCap/core/region_selector/renderers"
	"github.com/magiccap/MagicCap/core/threadsafescreenshot"
	img "image"
	"image/draw"
	"runtime"
	"sync"
	"sync/atomic"
	"time"
)

type edit struct {
	p *img.Point
	r *img.RGBA
}

var regionSelectorLock = sync.Mutex{}

// OpenRegionSelector is used to open a native region selector.
func OpenRegionSelector(ShowEditors, ShowMagnifier bool) *SelectorResult {
	// Lock the region selector.
	regionSelectorLock.Lock()

	// Get the number of displays.
	displayNum := screenshot.NumActiveDisplays()

	// Multi-thread getting all of the displays and making all of the images darker.
	ScreenshotLen := 0
	Screenshots := make([]*img.RGBA, displayNum)
	DarkerScreenshots := make([]*img.RGBA, displayNum)
	ScreenshotsLock := sync.Mutex{}
	wg := sync.WaitGroup{}
	wg.Add(displayNum)
	for i := 0; i < displayNum; i++ {
		go func(index int) {
			// Takes the screenshot.
			Screenshot, err := threadsafescreenshot.CaptureRect(screenshot.GetDisplayBounds(index))
			if err != nil {
				sentry.CaptureException(err)
				panic(err)
			}

			// Locks the screenshot lock.
			ScreenshotsLock.Lock()

			// Adds the screenshots to the arrays.
			Screenshots[index] = Screenshot
			x := img.NewRGBA(Screenshot.Rect)
			for i, v := range Screenshot.Pix {
				switch i % 4 {
				case 0, 1, 2:
					x.Pix[i] = uint8(float64(v) / 1.6)
				case 3:
					x.Pix[i] = v
				}
			}
			DarkerScreenshots[index] = x

			// Adds one to the screenshot length.
			ScreenshotLen++

			// Unlocks the screenshot lock.
			ScreenshotsLock.Unlock()

			// Sets this task to done.
			wg.Done()
		}(i)
	}
	wg.Wait()
	runtime.GC()

	// Defines the magnifier for each display.
	Magnifiers := make([]*magnifier.Magnifier, displayNum)

	// Kills all of the magnifiers.
	KillMagnifiers := func() {
		if ShowMagnifier {
			for _, v := range Magnifiers {
				v.Kill()
			}
		}
	}

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

	// Defines the last display the mouse was on.
	LastMouseDisplay := int64(-1)

	// Applies edits to a image.
	EditImage := func(index int) *img.RGBA {
		// Apply all edits for this display.
		Edits, _ := dispatcher.History[index]
		s := Screenshots[index]
		for _, v := range Edits {
			draw.Draw(s, v.r.Rect, v.r, *v.p, draw.Src)
		}
		return s
	}

	// Defines the renderer.
	renderer := renderers.OSRenderer()

	// Defines all of the display rectangles.
	var Displays []img.Rectangle

	// Set the mouse press callbacks.
	renderer.SetMousePressCallback(func(index int, pos img.Rectangle) {
		x, y := robotgo.GetMousePos()

		if HoveringEditor != "" {
			// Ignore this! This is in the editor.
			return
		}
		FirstPosMap[index] = &img.Point{
			X: x - pos.Min.X,
			Y: y - pos.Min.Y,
		}
		dispatcher.EscapeHandler = func() {
			FirstPosMap[index] = nil
		}
	})
	renderer.SetMouseReleaseCallback(func(index int, pos img.Rectangle) {
		x, y := robotgo.GetMousePos()

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
				X: x - pos.Min.X,
				Y: y - pos.Min.Y,
			}

			// Get the rectangle.
			Rect := img.Rect(FirstPosCpy.X, FirstPosCpy.Y, EndResult.X, EndResult.Y)

			// Nil the escape handler.
			dispatcher.EscapeHandler = nil

			if SelectedEditor == "__selector" {
				// Sets the result.
				Selection := EditImage(index).SubImage(Rect).(*img.RGBA)
				if len(Selection.Pix) != 0 {
					dispatcher.Result = &SelectorResult{
						Selection:      Selection,
						Screenshots:    Screenshots,
						Displays:       Displays,
						DisplayIndex:   index,
						TopLeftDisplay: &Rect.Min,
					}
				}

				// Closes the window.
				renderer.ShouldClose()
			} else {
				// Get the selection.
				Selection := Screenshots[index].SubImage(Rect).(*img.RGBA)

				// Run the editor.
				// TODO: Don't hardcode RGBA values.
				Result := editors.Editors[SelectedEditor].Apply(Selection, [3]uint8{255, 0, 0})
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
	})

	// Sets the key handler.
	KeysDown := make([]int, 0)
	KeysDownLock := sync.RWMutex{}
	KeysReleased := 0
	KeysReleasedLock := sync.Mutex{}
	renderer.SetKeyCallback(func(Release bool, index, key int) {
		if !Release {
			// Log this key as down and return.
			KeysDownLock.RLock()
			KeysDown = append(KeysDown, key)
			KeysDownLock.RUnlock()
			return
		}

		for _, v := range KeysDown {
			if v == key {
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
					KeyUpHandler(renderer, KeysDown, (int)(atomic.LoadInt64(&LastMouseDisplay)), &dispatcher)
					KeysDown = make([]int, 0)
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

	// Initialise the renderer.
	renderer.Init(DarkerScreenshots, Screenshots)

	// Get all the display rectangles.
	Displays = renderer.GetDisplayRectangles()

	// Defines the loop to handle input updates.
	MouseMovedDisplayPtr := uintptr(0)
	KillSwitch := uintptr(0)
	MouseX := int64(-9223372036854775807)
	MouseY := int64(-9223372036854775807)
	go func() {
		// Defines the previous X/Y.
		previousX := -9223372036854775807
		previousY := -9223372036854775807

		// Loop getting the mouse position.
		for atomic.LoadUintptr(&KillSwitch) == 0 {
			x, y := robotgo.GetMousePos()
			if x != previousX || y != previousY {
				// The position has changed. Has the display?
				lastDisplay := (int)(atomic.LoadInt64(&LastMouseDisplay))
				for i, Rect := range Displays {
					if x >= Rect.Min.X && Rect.Max.X >= x && y >= Rect.Min.Y && Rect.Max.Y >= y {
						if lastDisplay != i {
							// The last display the mouse was on was not i.
							// This means that the mouse moved display.
							// We do this in another loop so that we can enforce it across all displays in the loop below.
							atomic.StoreInt64(&LastMouseDisplay, int64(i))
							atomic.StoreUintptr(&MouseMovedDisplayPtr, 1)
						}
						break
					}
				}
				atomic.StoreInt64(&MouseX, (int64)(x))
				atomic.StoreInt64(&MouseY, (int64)(y))
			}

			// Handles polling for renderer events.
			renderer.PollEvents()

			// Sleep for 2ms (500fps).
			time.Sleep(time.Millisecond * 2)
		}
	}()

	// Handles events in the window.
	FirstTick := true
	for {
		// Defines if the mouse moved displays during the process.
		MouseMovedDisplay := atomic.SwapUintptr(&MouseMovedDisplayPtr, 0) == 1
		x := (int)(atomic.LoadInt64(&MouseX))
		y := (int)(atomic.LoadInt64(&MouseY))

		ShouldBreakOuter := false
		lastDisplay := (int)(atomic.LoadInt64(&LastMouseDisplay))
		for i, Rect := range Displays {
			// Gets the point relative to the display.
			// If DisplayPoint is nil, the point is not on this display.
			var DisplayPoint *img.Point
			if lastDisplay == i {
				DisplayPoint = &img.Point{
					X: x - Rect.Min.X,
					Y: y - Rect.Min.Y,
				}
			}

			// Handle events when the magnifier is shown.
			if ShowMagnifier {
				if Magnifiers[i] == nil {
					// The magnifier has not been created yet, we should create it.
					Magnifiers[i] = magnifier.NewMagnifier(renderer, i, Screenshots[i].Bounds().Dx(), Screenshots[i].Bounds().Dy(), DisplayPoint)
				}

				if DisplayPoint != nil {
					// The user is on this display, ensure the magnifier position is correct (but in a goroutine, we don't want to block the draw).
					m := Magnifiers[i]
					go m.SetPos(DisplayPoint.X, DisplayPoint.Y)
				}
			}

			// Makes the window the current context.
			if renderer.WindowShouldClose(i) {
				ShouldBreakOuter = true
				break
			}

			// Don't bother drawing if this is the same as last frame.
			if DisplayPoint == nil && !FirstTick && !MouseMovedDisplay {
				continue
			}

			// Handles the window.
			var f []byte
			if ShowMagnifier {
				f = Magnifiers[i].GetFrame()
			}
			h := RenderDisplay(DisplayPoint, FirstPosMap[i], i, renderer, x, y, SelectedEditor, ShowEditors, dispatcher.History[i], f)
			HoveringEditor = h

			// Sleep for 2ms (500fps).
			time.Sleep(time.Millisecond * 2)
		}

		// Handles the outer for loops and set the kill switch.
		if ShouldBreakOuter {
			atomic.StoreUintptr(&KillSwitch, 1)
			break
		}

		// Ensure FirstTick is false.
		FirstTick = false
	}

	// Cleans up the windows.
	renderer.DestroyAll()

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
		regionSelectorLock.Unlock()
		KillMagnifiers()
		runtime.GC()
		return &SelectorResult{
			Selection:    EditImage(Display),
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
		regionSelectorLock.Unlock()
		KillMagnifiers()
		runtime.GC()
		return dispatcher.Result
	}

	// Return null.
	regionSelectorLock.Unlock()
	KillMagnifiers()
	runtime.GC()
	return nil
}
