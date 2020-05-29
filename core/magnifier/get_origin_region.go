package magnifier

// Used to get the region from the origin texture. Put a black outline in the event it doesn't fit.
func (m *Magnifier) getOriginRegion(w, h, x, y int) []byte {
	// Get the left/top of the texture.
	left := x-(w/2)
	top := y-(h/2)

	// Will be set as the resulting bytes from the main thread.
	var b []byte

	// Is this a perfect condition? Lets check/handle this.
	LeftOverflow := 0 > left
	TopOverflow := 0 > top
	RightOverflow := left+w > m.originWidth
	BottomOverFlow := top+h > m.originHeight
	if !LeftOverflow && !TopOverflow && !RightOverflow && !BottomOverFlow {
		// This is great! Run the basic pixels function.
		b = m.renderer.GetNormalTexturePixels(m.index, left, top, w, h)
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
		b = m.renderer.GetNormalTexturePixels(m.index, left+LeftAdd, top+TopAdd, DisplayPixelsW, h+HeightAdd)

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
