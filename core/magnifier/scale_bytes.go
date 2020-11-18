package magnifier

// Used to scale bytes in 4 byte chunks. This is designed to try and hit the CPU cache as much as possible.
func scaleBytes(origin []byte, scale, currentHeight int) []byte {
	// Multiply the pixels by the scale.
	// We essentially want to duplicate each RGBA 4 byte chunk by the scale for the rows.
	ScaledPixelsVertical := make([]byte, len(origin)*scale)
	spvLen := len(ScaledPixelsVertical)
	ScaledPixels := make([]byte, spvLen*scale)
	ol := len(origin)
	for i := 0; i < ol; i += 4 {
		// Get the delta.
		ScaledBlock := i*scale

		// Whilst under scale, add to the array.
		for x := 0; x < scale; x++ {
			ScaledPixelsVertical[ScaledBlock] = origin[i]
			ScaledPixelsVertical[ScaledBlock+1] = origin[i+1]
			ScaledPixelsVertical[ScaledBlock+2] = origin[i+2]
			ScaledPixelsVertical[ScaledBlock+3] = origin[i+3]
			ScaledBlock += 4
		}
	}

	// From here, we want to multiply by the scale again. We want to go by rows now.
	RowCount := spvLen/currentHeight
	CurrentIndex := 0
	for i := 0; i < currentHeight; i++ {
		PastPixels := RowCount*i
		Row := ScaledPixelsVertical[PastPixels:PastPixels+RowCount]
		for x := 0; x < scale; x++ {
			for r := 0; r < RowCount; r++ {
				ScaledPixels[CurrentIndex] = Row[r]
				CurrentIndex++
			}
		}
	}

	// Return the scaled pixels.
	return ScaledPixels
}
