package displaymanagement

import (
	"github.com/kbinani/screenshot"
	"image"
	"sort"
)

// GetActiveDisplaysOrdered is a function which is used to get all active displays in order.
func GetActiveDisplaysOrdered() []image.Rectangle {
	AllDisplays := make([]image.Rectangle, 0)
	n := screenshot.NumActiveDisplays()

	for i := 0; i < n; i++ {
		AllDisplays = append(AllDisplays, screenshot.GetDisplayBounds(i))
	}

	sort.Slice(AllDisplays, func(a, b int) bool {
		return AllDisplays[a].Min.X < AllDisplays[b].Min.X
	})

	return AllDisplays
}
