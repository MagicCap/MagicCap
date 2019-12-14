package displaymanagement

// StitchAllDisplays is used to stitch all of the displays together.
func StitchAllDisplays() {
	AllDisplays := GetActiveDisplaysOrdered()
	CaptureAllDisplays(AllDisplays)
	// Images := ^
	// TODO: Finish the stitching function.
}
