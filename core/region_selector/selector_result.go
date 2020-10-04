package regionselector

import "image"

// SelectorResult defines the result from the region selector.
type SelectorResult struct {
	Selection      *image.RGBA
	Screenshots    []*image.RGBA
	Displays       []image.Rectangle
	DisplayIndex   int
	TopLeftDisplay *image.Point
}
