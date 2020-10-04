package threadsafescreenshot

import (
	"github.com/kbinani/screenshot"
	"image"
	"sync"
)

var screenshotLock = sync.Mutex{}

// CaptureRect captures specified region of desktop.
func CaptureRect(rect image.Rectangle) (*image.RGBA, error) {
	screenshotLock.Lock()
	x, err := screenshot.CaptureRect(rect)
	screenshotLock.Unlock()
	return x, err
}

// GetCapture returns screen capture of specified desktop region.
// x and y represent distance from the upper-left corner of main display.
// Y-axis is downward direction. This means coordinates system is similar to Windows OS.
func GetCapture(x, y, width, height int) (*image.RGBA, error) {
	screenshotLock.Lock()
	res, err := screenshot.Capture(x, y, width, height)
	screenshotLock.Unlock()
	return res, err
}
