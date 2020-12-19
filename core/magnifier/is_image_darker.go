package magnifier

// This returns if the image is darker.
func isImageDarker(b []byte) bool {
	// Set R, G and B added.
	RGBAdded := 0

	// Go through each byte and add to the relevant int.
	for i, v := range b {
		switch i % 4 {
		case 0, 1, 2:
			RGBAdded += int(v)
		}
	}

	// Get the amount of pixels.
	Pixels := len(b) / 4

	// Get the average of R, G and B.
	RGBAverage := RGBAdded / Pixels

	// Get the average of all colors.
	ColorAverage := RGBAverage / 3

	// Return 50 > ColorAverage (is likely a black surface).
	return 50 > ColorAverage
}
