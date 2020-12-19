// +build ignore

package main

import (
	"bytes"
	"compress/gzip"
	"crypto/sha512"
	"io/ioutil"
)

const lowerHex = "0123456789abcdef"

func main() {
	// Get the magiccap-darwin binary.
	b, err := ioutil.ReadFile("../magiccap-darwin")
	if err != nil {
		panic(err)
	}

	// Calculate the hash.
	hash := sha512.New()
	hash.Write(b)
	sum := hash.Sum(nil)

	// Run gzip.
	buf := &bytes.Buffer{}
	w := gzip.NewWriter(buf)
	if _, err := w.Write(b); err != nil {
		panic(err)
	}
	if err := w.Flush(); err != nil {
		panic(err)
	}
	if err := w.Close(); err != nil {
		panic(err)
	}
	b = buf.Bytes()

	// Create the byte array.
	newBuf := bytes.Buffer{}
	x := []byte(`\x00`)
	_, _ = newBuf.WriteString("package main\n\nvar hash = []byte(\"")
	for _, v := range sum {
		x[2] = lowerHex[v/16]
		x[3] = lowerHex[v%16]
		_, _ = newBuf.Write(x)
	}
	_, _ = newBuf.WriteString("\")\n\nfunc binary() []byte { return []byte(\"")
	for _, v := range b {
		x[2] = lowerHex[v/16]
		x[3] = lowerHex[v%16]
		_, _ = newBuf.Write(x)
	}
	_, _ = newBuf.WriteString("\") }\n")

	// Write the file.
	if err := ioutil.WriteFile("binary_file_gen.go", newBuf.Bytes(), 0666); err != nil {
		panic(err)
	}
}
