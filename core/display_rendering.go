// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email 2019.

package core

import (
	"image"
	"sort"

	"github.com/kbinani/screenshot"
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

// CaptureAllDisplays is a function used to capture all displays attached in order.
func CaptureAllDisplays(Ordered []image.Rectangle) []*image.RGBA {
	Screenshots := make([]*image.RGBA, len(Ordered))
	for i, v := range Ordered {
		s, err := screenshot.CaptureRect(v)
		if err != nil {
			// This is a super core component; this shouldn't fail!
			// If it does, this tool won't work for the user anyway.
			panic(err)
		}
		Screenshots[i] = s
	}
	return Screenshots
}

// StitchAllDisplays is used to stitch all of the displays together.
func StitchAllDisplays() {
	AllDisplays := GetActiveDisplaysOrdered()
	CaptureAllDisplays(AllDisplays)
	// Images := ^
	// TODO: Finish the stitching function.
}
