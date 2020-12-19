package magnifier

import "sync"

// Draw the grid.
func drawGrid(b []byte, white bool, every, w, h int) []byte {
	// Create the grid column.
	GridRow := make([]byte, w*4)
	Tasks := make(chan bool)
	go func() {
		for i := range GridRow {
			if white || (i+1)%4 == 0 {
				GridRow[i] = 255
			}
		}
		Tasks <- true
	}()
	XMidpoint := (w * 4) / 2
	CrosshairRowLeft := make([]byte, XMidpoint-(every*4))
	CrosshairRowRight := make([]byte, XMidpoint)
	go func() {
		for i := range CrosshairRowLeft {
			CrosshairRowLeft[i] = 255
		}
		Tasks <- true
	}()
	go func() {
		for i := range CrosshairRowRight {
			CrosshairRowRight[i] = 255
		}
		Tasks <- true
	}()
	for i := 0; i < 3; i++ {
		<-Tasks
	}

	// Get the height midpoint start/end.
	HMidpointStart := (h / 2) - every
	HMidpointEnd := HMidpointStart + every

	// Draw the rows/columns.
	ReallignedArray := make([]byte, 0, len(b))
	rc := 0
	for i := 0; i < h; i++ {
		// Get the current index.
		CurrentIndex := i * w * 4

		// Get the width endpoint start.
		WEndpointStart := (w / 2) - (every / 2) - 1

		if i >= HMidpointStart && HMidpointEnd >= i {
			// This is in the horizontal midpoint.
			// We need to run some logic here to handle showing the current pixel.
			ReallignedArray = append(ReallignedArray, CrosshairRowLeft...)
			WEndpointMemStart := WEndpointStart * 4
			WEndpointMemEnd := WEndpointMemStart + (every * 4)
			ReallignedArray = append(ReallignedArray, b[CurrentIndex+WEndpointMemStart:CurrentIndex+WEndpointMemEnd]...)
			ReallignedArray = append(ReallignedArray, CrosshairRowRight...)
			rc++
			continue
		}

		// If rows complete mod every is 0, insert rows here.
		if rc%every == 0 {
			ReallignedArray = append(ReallignedArray, GridRow...)
			rc++
			continue
		}

		// Get the row.
		Row := b[CurrentIndex : CurrentIndex+len(GridRow)]

		// Handle the columns.
		WEndpointEnd := WEndpointStart + (every / 2)
		WEndpointStart -= every / 2
		for x := 0; x < w; x++ {
			if (x+1)%every == 0 {
				// Handle setting this pixel to the expected color.
				StartPos := x * 4
				if white {
					Row[StartPos] = 255
					Row[StartPos+1] = 255
					Row[StartPos+2] = 255
				} else {
					Row[StartPos] = 0
					Row[StartPos+1] = 0
					Row[StartPos+2] = 0
				}
				Row[StartPos+3] = 255
			} else if x >= WEndpointStart && WEndpointEnd >= x {
				// Handle the white pixel placement.
				StartPos := x * 4
				Row[StartPos] = 255
				Row[StartPos+1] = 255
				Row[StartPos+2] = 255
				Row[StartPos+3] = 255
			}
		}

		// Append the row.
		ReallignedArray = append(ReallignedArray, Row...)

		// Add 1 to rows complete.
		rc++
	}
	b = ReallignedArray

	// Return the bytes.
	return b
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
	whiteGridCache[cacheInfo{
		w:     200,
		h:     200,
		every: 10,
	}] = drawGrid(filled1, true, 10, 200, 200)
	blackGridCache[cacheInfo{
		w:     200,
		h:     200,
		every: 10,
	}] = drawGrid(filled2, false, 10, 200, 200)
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
		cached = drawGrid(cached, white, every, w, h)
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
