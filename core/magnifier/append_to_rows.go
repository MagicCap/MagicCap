package magnifier

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
