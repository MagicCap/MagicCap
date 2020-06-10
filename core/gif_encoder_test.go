package core

import (
	"container/list"
	"image"
	"image/draw"
	"sync"
	"testing"
)

// BenchmarkGIFEncoder is used to benchmark the GIF encoder.
func BenchmarkGIFEncoder(b *testing.B) {
	// Create the mock images.
	l := list.New()
	i := 0
	for i != 10000 {
		img := image.NewRGBA(image.Rect(0, 0, 200, 200))
		draw.Draw(img, img.Rect, image.Black, image.Point{}, draw.Over)
		l.PushBack(img)
		i++
	}
	wg := &sync.WaitGroup{}
	b.ResetTimer()

	// Encode the GIF.
	gifEncoder(wg, l, 30)
}
