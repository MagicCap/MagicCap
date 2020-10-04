package magnifier

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
