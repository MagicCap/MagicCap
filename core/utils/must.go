package utils

import "github.com/gobuffalo/packr/v2"

// MustString takes a box/filename and must return a string.
func MustString(Box *packr.Box, Filename string) string {
	s, err := Box.FindString(Filename)
	if err != nil {
		panic(err)
	}
	return s
}

// MustBytes takes a box/filename and must return bytes.
func MustBytes(Box *packr.Box, Filename string) []byte {
	b, err := Box.Find(Filename)
	if err != nil {
		panic(err)
	}
	return b
}
