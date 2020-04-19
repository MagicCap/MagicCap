package magnifier

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
	XMidpoint := (w*4)/2
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
	HMidpointStart := (h/2)-every
	HMidpointEnd := HMidpointStart+every

	// Draw the rows/columns.
	ReallignedArray := make([]byte, 0, len(b))
	rc := 0
	for i := 0; i < h; i++ {
		// Get the current index.
		CurrentIndex := i*w*4

		if i >= HMidpointStart && HMidpointEnd >= i {
			// This is in the horizontal midpoint.
			// We need to run some logic here to handle showing the current pixel.
			ReallignedArray = append(ReallignedArray, CrosshairRowLeft...)
			index := CurrentIndex + ((w * 4) / 2) - ((every * 4) / 2)
			ReallignedArray = append(ReallignedArray, b[index:index+(every * 4)]...)
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
		Row := b[CurrentIndex:CurrentIndex+len(GridRow)]

		// Handle the columns.
		for x := 0; x < w; x++ {
			if (x+1)%every == 0 {
				// Handle setting this pixel to the expected color.
				StartPos := x*4
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
