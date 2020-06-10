package core

import (
	"bytes"
	"container/list"
	"image"
	"image/color/palette"
	"image/draw"
	"image/gif"
	"sync"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/kbinani/screenshot"
)

func gifEncoder(wg *sync.WaitGroup, Images *list.List, fps int) []byte {
	// Create the GIF item.
	g := &gif.GIF{}
	l := Images.Len()
	g.Image = make([]*image.Paletted, l)
	g.Delay = make([]int, l)

	// Defines the GIF options.
	opts := gif.Options{
		NumColors: 256,
		Drawer:    draw.FloydSteinberg,
	}

	// Defines the space per frame.
	spf := int(100 / float64(fps))

	// Get the bounds of the front image.
	b := Images.Front().Value.(*image.RGBA).Bounds()

	// Defines the limited part of plan 9 that we need.
	p9l := palette.Plan9[:opts.NumColors]

	// Get the items from the array.
	x := Images.Front()
	index := 0
	wg.Add(l)
	for x != nil {
		go func(i int, r *image.RGBA) {
			// Draw the paletted image.
			pimg := image.NewPaletted(b, p9l)
			opts.Drawer.Draw(pimg, b, r, image.ZP)

			// Add to the images.
			g.Image[i] = pimg
			g.Delay[i] = spf

			// Set wg option to done.
			wg.Done()
		}(index, x.Value.(*image.RGBA))

		// Get the next item from the list.
		x = x.Next()
		index++
	}
	wg.Wait()

	// Encodes the GIF.
	buf := bytes.Buffer{}
	_ = gif.EncodeAll(&buf, g)
	return buf.Bytes()
}

// NewGIFCapture is used to creat a GIF based on a display region.
func NewGIFCapture(Rect *image.Rectangle, StopChan chan bool) []byte {
	wg := sync.WaitGroup{}
	lock := sync.Mutex{}
	Images := list.New()
	for {
		select {
		default:
			go func() {
				// Add one to the wait group.
				wg.Add(1)

				// Take the screenshot.
				s, err := screenshot.CaptureRect(*Rect)
				if err != nil {
					sentry.CaptureException(err)
					panic(err)
				}

				// Lock the thread lock.
				lock.Lock()

				// Add this to the image buffer.
				Images.PushBack(s)

				// Unlock the thread lock.
				lock.Unlock()

				// We are done here.
				wg.Done()
			}()
		case <-StopChan:
			// Turn this into a GIF.
			return gifEncoder(&wg, Images, 30)
		}

		// Add a 30fps frame cap.
		time.Sleep(time.Second / 30)
	}
}
