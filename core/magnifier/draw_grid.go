package magnifier

import "sync"

func drawGrid(b []byte, white bool, every, w, h int) {
	// Set the X/Y position of the pixel.
	// Y is -1 because 0 % w == 0 so that check will return true on first run.
	x := 0
	y := -1

	// Get the width and height divided by 2.
	wd2 := w/2
	hd2 := h/2

	// Get the start and end where the Y bar will be.
	yBarStart := wd2 - every
	yBarEnd := yBarStart + every

	// Get the start and end where the X bar will be.
	xBarStart := hd2 - every
	xBarEnd := xBarStart + every

	// Iterate through each pixel.
	bytesIndex := 0
	for pixelIndex := 0; pixelIndex < w*h; pixelIndex++ {
		// If pixelIndex mod w equals 0, it means we hit the end of a row.
		// This means we should add 1 to Y and X should reset.
		if pixelIndex % w == 0 {
			x = 0
			y++
		}

		if x >= yBarStart && yBarEnd >= x {
			// This is where the Y bar should be.
			// However, there is the intersection which we should ignore.
			// In that instance we do want to get here still though so we can jump out the if easily.
			if y > xBarEnd || xBarStart > y {
				b[bytesIndex] = 255
				b[bytesIndex+1] = 255
				b[bytesIndex+2] = 255
			}
		} else if y >= xBarStart && xBarEnd >= y {
			// We should paint the bar. The intersection doesn't matter here because that's handled above.
			b[bytesIndex] = 255
			b[bytesIndex+1] = 255
			b[bytesIndex+2] = 255
		} else if (y != 0 && y % every == 0) || (x != 0 && x % every == 0) {
			// We should paint the correct color here.
			c := uint8(0)
			if white {
				c = 255
			}
			b[bytesIndex] = c
			b[bytesIndex+1] = c
			b[bytesIndex+2] = c
		}

		// Add 1 to X.
		x++

		// Add 4 to the bytes index (adding 4 because RGBA).
		bytesIndex += 4
	}
}

// Defines the information for the grid cache.
type cacheInfo struct {
	w, h, every int
}

// Handles the grid cache. We basically expect a 100% cache hit rate unless the size changes.
var (
	whiteGridCache     = map[cacheInfo][]byte{}
	blackGridCache     = map[cacheInfo][]byte{}
	whiteGridCacheLock = sync.RWMutex{}
	blackGridCacheLock = sync.RWMutex{}
)

// The magic byte used to represent blank-ness.
const magicByte = uint8(0x69)

// Pre-render a 200x200 grid with a row every 10px that's both black and white.
func init() {
	whiteGridCacheLock.Lock()
	blackGridCacheLock.Lock()
	filled1 := make([]byte, 200*200*4)
	filled2 := make([]byte, 200*200*4)
	for i := range filled1 {
		filled1[i] = magicByte
		filled2[i] = magicByte
	}
	drawGrid(filled1, true, 10, 200, 200)
	drawGrid(filled2, false, 10, 200, 200)
	whiteGridCache[cacheInfo{
		w:     200,
		h:     200,
		every: 10,
	}] = filled1
	blackGridCache[cacheInfo{
		w:     200,
		h:     200,
		every: 10,
	}] = filled2
	whiteGridCacheLock.Unlock()
	blackGridCacheLock.Unlock()
}

// Draw the grid with a cache.
func drawGridCached(b []byte, white bool, every, w, h int) []byte {
	var cached []byte
	if white {
		whiteGridCacheLock.RLock()
		cached, _ = whiteGridCache[cacheInfo{
			w:     w,
			h:     h,
			every: every,
		}]
		whiteGridCacheLock.RUnlock()
	} else {
		blackGridCacheLock.RLock()
		cached, _ = blackGridCache[cacheInfo{
			w:     w,
			h:     h,
			every: every,
		}]
		blackGridCacheLock.RUnlock()
	}
	if cached == nil {
		// Create the grid.
		cached = make([]byte, w*h*4)
		for i := range cached {
			cached[i] = magicByte
		}
		drawGrid(cached, white, every, w, h)
		if white {
			whiteGridCacheLock.Lock()
			whiteGridCache[cacheInfo{
				w:     w,
				h:     h,
				every: every,
			}] = cached
			whiteGridCacheLock.Unlock()
		} else {
			blackGridCacheLock.Lock()
			blackGridCache[cacheInfo{
				w:     w,
				h:     h,
				every: every,
			}] = cached
			blackGridCacheLock.Unlock()
		}
	}
	for i, v := range cached {
		if v != magicByte {
			b[i] = v
		}
	}
	return b
}
