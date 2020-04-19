package magnifier

// This returns if the image is darker.
func isImageDarker(b []byte) bool {
	// Set R, G and B added.
	RAdded := 0
	GAdded := 0
	BAdded := 0

	// Go through each byte and add to the relevant int.
	i := 0
	for _, v := range b {
		switch i {
		case 0:
			RAdded += int(v)
			break
		case 1:
			GAdded += int(v)
			break
		case 2:
			BAdded += int(v)
			break
		}
		i++
		if i == 4 {
			i = 0
		}
	}

	// Get the amount of pixels.
	Pixels := len(b)/4

	// Get the average of R, G and B.
	RAverage := RAdded/Pixels
	GAverage := GAdded/Pixels
	BAverage := BAdded/Pixels

	// Get the average of all colors.
	ColorAverage := (RAverage+GAverage+BAverage)/3

	// Return 100 > ColorAverage (is likely a black surface).
	return 100 > ColorAverage
}
