package magnifier

import (
	"github.com/MagicCap/glhf"
	"github.com/magiccap/MagicCap/core/mainthread"
	"image"
	"sync"
	"time"
)

// Magnifier defines the magnifier.
type Magnifier struct {
	imgLock sync.Mutex
	img []byte
	originTexture *glhf.Texture
	pos *image.Point
	lastPos *image.Point
	posLock sync.Mutex
	kill bool
	killLock sync.Mutex
	originWidth int
	originHeight int
}

// This function is designed to append something to each row within an array.
// To use this function, simply pass in the array, what you want to append/prepend, whether you want to append and the number of rows.
func appendToRows(Array, ToAppend []byte, Repeat int, Append bool, Rows int) []byte {
	// Create the new array.
	NewArray := make([]byte, 0, len(Array)+(len(ToAppend)*Repeat*Rows))

	// Get the length of each row.
	RowLen := len(Array)/Rows

	// Keep appending until the lengths are correct.
	x := make([]byte, RowLen)
	i := 0
	f := func() {
		if i == RowLen {
			// Ok, we append everything and replace x.
			if !Append {
				for i := 0; i < Repeat; i++ {
					NewArray = append(NewArray, ToAppend...)
				}
			}
			NewArray = append(NewArray, x...)
			if Append {
				for i := 0; i < Repeat; i++ {
					NewArray = append(NewArray, ToAppend...)
				}
			}
			x = make([]byte, RowLen)
			i = 0
		}
	}
	for _, v := range Array {
		f()
		x[i] = v
		i++
	}
	f()

	// Return the new array.
	return NewArray
}

// Used to get the region from the origin texture. Put a black outline in the event it doesn't fit.
func (m *Magnifier) getOriginRegion(w, h, x, y int) []byte {
	// Get the left/top of the texture.
	left := x-(w/2)
	top := y-(h/2)

	// Handle the begin function of the texture.
	mainthread.ExecMainThread(m.originTexture.Begin)

	// Will be set as the resulting bytes from the main thread.
	var b []byte

	// Is this a perfect condition? Lets check/handle this.
	LeftOverflow := 0 > left
	TopOverflow := 0 > top
	RightOverflow := left+w > m.originWidth
	BottomOverFlow := top+h > m.originHeight
	if !LeftOverflow && !TopOverflow && !RightOverflow && !BottomOverFlow {
		// This is great! Run the basic pixels function.
		mainthread.ExecMainThread(func() { b = m.originTexture.Pixels(left, top, w, h) })
		mainthread.ExecMainThread(m.originTexture.End)
	} else {
		// We have an overflow somewhere. We need to handle this during the processing.
		LeftAdd := 0
		WidthAdd := 0
		if LeftOverflow {
			// We need to add left * -1 (the amount that it is over by) to the left side.
			// However, we need to add this as a negative number to the width.
			WidthAdd += left
			LeftAdd += left * -1
		} else if RightOverflow {
			// We should subtract the origin width from left+w to get how much it is over by.
			OverBy := (left+w) - m.originWidth

			// Now we know how much it is over by, we should remove this from the width.
			WidthAdd -= OverBy
		}
		TopAdd := 0
		HeightAdd := 0
		if TopOverflow {
			// We need to add top * -1 (the amount that it is over by) to the top side.
			// However, we need to add this as a negative number to the height.
			HeightAdd += top
			TopAdd = top * -1
		} else if BottomOverFlow {
			// We should subtract the origin height from top+h to get how much it is over by.
			OverBy := (top+h) - m.originHeight

			// Now we know how much it is over by, we should remove this from the height.
			HeightAdd -= OverBy
		}

		// Get the relevant pixels from the display.
		DisplayPixelsW := w+WidthAdd
		mainthread.ExecMainThread(func() { b = m.originTexture.Pixels(left+LeftAdd, top+TopAdd, DisplayPixelsW, h+HeightAdd) })
		mainthread.ExecMainThread(m.originTexture.End)

		// Ok, step 2. We now need to handle processing these bytes in various ways to add "blackness" where there is missing content.

		// Handle vertical calculations first. From here, we do not need to worry about these being modified in the horizontal calculations.
		if TopOverflow {
			// For a top overflow we need to add a bunch of 4 byte blocks at the beginning of the array ([0 0 0 255]).
			// The length of the start of the modifications to this array will add up to (TopAdd * DisplayPixelsW) * 4.
			TopBlockLen := (TopAdd * DisplayPixelsW) * 4
			NewBytes := make([]byte, TopBlockLen+len(b))
			x := 0
			for i := range NewBytes {
				if i >= TopBlockLen {
					// Ok, we should get the old bytes.
					NewBytes[i] = b[i-TopBlockLen]
					continue
				}

				// Handle the top colorization.
				switch x {
				case 0, 1, 2:
					NewBytes[i] = 0
				case 3:
					NewBytes[i] = 255
				}
				x++
				if x == 4 {
					x = 0
				}
			}
			b = NewBytes
		} else if BottomOverFlow {
			// For a bottom overflow we need to add a bunch of 4 byte blocks at the bottom of the array ([0 0 0 255]).
			// The length of the start of the modifications to this array will add up to ((HeightAdd * -1) * DisplayPixelsW) * 4.
			BottomBlockLen := ((HeightAdd * -1) * DisplayPixelsW) * 4
			bl := len(b)
			NewBytes := make([]byte, BottomBlockLen+bl)
			x := 0
			for i := range NewBytes {
				if i >= bl {
					// Handle inserting blackness.
					switch x {
					case 0, 1, 2:
						NewBytes[i] = 0
					case 3:
						NewBytes[i] = 255
					}
					x++
					if x == 4 {
						x = 0
					}
					continue
				}

				// Copy the bytes.
				NewBytes[i] = b[i]
			}
			b = NewBytes
		}

		// Now we shall handle the horizontal calculations.
		// This requires a bit more maths since we need to think about each row.
		black := []byte{0, 0, 0, 255}
		if LeftOverflow {
			// For each row, we need to add a bunch of 4 byte blocks to the front of it ([0 0 0 255]).
			b = appendToRows(b, black, LeftAdd, false, h)
		} else if RightOverflow {
			// For each row, we need to add a bunch of 4 byte blocks to the end of it ([0 0 0 255]).
			b = appendToRows(b, black, WidthAdd * -1, true, h)
		}
	}

	// Return the resulting bytes.
	return b
}

// Used to scale bytes in 4 byte chunks.
func scaleBytes(origin []byte, scale, currentHeight int) []byte {
	// Multiply the pixels by the scale.
	// We essentially want to duplicate each RGBA 4 byte chunk by the scale for the rows.
	ScaledPixelsVertical := make([]byte, len(origin)*scale)
	ScaledPixels := make([]byte, len(ScaledPixelsVertical)*scale)
	for i := 0; i < len(origin)/4; i++ {
		// Get the delta.
		NormalBlock := i*4
		ScaledBlock := NormalBlock*scale

		// Whilst under scale, add to the array.
		for x := 0; x < scale; x++ {
			ScaledPixelsVertical[ScaledBlock] = origin[NormalBlock]
			ScaledPixelsVertical[ScaledBlock+1] = origin[NormalBlock+1]
			ScaledPixelsVertical[ScaledBlock+2] = origin[NormalBlock+2]
			ScaledPixelsVertical[ScaledBlock+3] = origin[NormalBlock+3]
			ScaledBlock += 4
		}
	}

	// From here, we want to multiply by the scale again. We want to go by rows now.
	RowCount := len(ScaledPixelsVertical)/currentHeight
	CurrentIndex := 0
	for i := 0; i < currentHeight; i++ {
		PastPixels := RowCount*i
		Row := ScaledPixelsVertical[PastPixels:PastPixels+RowCount]
		for x := 0; x < scale; x++ {
			for r := 0; r < len(Row); r++ {
				ScaledPixels[CurrentIndex] = Row[r]
				CurrentIndex++
			}
		}
	}

	// Return the scaled pixels.
	return ScaledPixels
}

// Used to draw the image. This should be rate limited to something like 60fps.
func (m *Magnifier) draw(x, y, resultW, resultH, scale int) {
	// Get the region.
	RegionPixels := m.getOriginRegion(resultW/scale, resultH/scale, x, y)

	// Lock the image lock.
	m.imgLock.Lock()

	// Set the texture.
	m.img = scaleBytes(RegionPixels, scale, resultH/scale)

	// Unlock the image lock.
	m.imgLock.Unlock()
}

// Kill is used to kill the magnifier.
func (m *Magnifier) Kill() {
	m.killLock.Lock()
	m.kill = true
	m.killLock.Unlock()
}

// GetFrame is used to get the frame from the magnifier.
func (m *Magnifier) GetFrame() []byte {
	m.imgLock.Lock()
	img := m.img
	m.imgLock.Unlock()
	return img
}

// SetPos is used to set the position on a magnifier.
func (m *Magnifier) SetPos(x, y int) {
	m.posLock.Lock()
	m.pos = &image.Point{
		X: x,
		Y: y,
	}
	m.posLock.Unlock()
}

// Get information about the texture.
func (m *Magnifier) getTextureInformation() {
	m.originWidth = m.originTexture.Width()
	m.originHeight = m.originTexture.Height()
}

// NewMagnifier is used to create a new version of the magnifier.
func NewMagnifier(origin *glhf.Texture, InitPos *image.Point) *Magnifier {
	m := Magnifier{originTexture: origin, pos: InitPos}
	m.getTextureInformation()
	d := func() bool {
		m.posLock.Lock()
		p := m.pos
		lp := m.lastPos
		if p == nil {
			m.posLock.Unlock()
			if m.img == nil {
				m.imgLock.Lock()
				i := image.NewRGBA(image.Rect(0, 0, 200, 200))
				m.img = i.Pix
				m.imgLock.Unlock()
			}
			return false
		}
		if lp != nil && lp.Y == p.Y && lp.X == p.X {
			m.posLock.Unlock()
			return false
		}
		m.lastPos = p
		x := p.X
		y := p.Y
		m.posLock.Unlock()
		m.killLock.Lock()
		if m.kill {
			m.killLock.Unlock()
			return true
		}
		m.killLock.Unlock()
		m.draw(x, y, 200, 200, 4)
		return false
	}
	d()
	go func() {
		for {
			// Add a 60fps cap to this.
			time.Sleep(time.Second / 60)
			if d() {
				return
			}
		}
	}()
	return &m
}
