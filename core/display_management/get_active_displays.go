package displaymanagement

import (
	"github.com/kbinani/screenshot"
	"image"
)

// GetActiveDisplays is a function which is used to get all active displays.
func GetActiveDisplays() []image.Rectangle {
	AllDisplays := make([]image.Rectangle, 0)
	n := screenshot.NumActiveDisplays()

	for i := 0; i < n; i++ {
		AllDisplays = append(AllDisplays, screenshot.GetDisplayBounds(i))
	}

	return AllDisplays
}
