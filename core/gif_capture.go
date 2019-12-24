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

// NewGIFCapture is used to creat a GIF based on a display region.
func NewGIFCapture(Rect *image.Rectangle, StopChan chan bool) []byte {
	w := bytes.Buffer{}
	GIF := gif.GIF{}
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
			wg.Wait()
			Count := Images.Len()
			wg.Add(Count)
			GIF.Image = make([]*image.Paletted, Count)
			GIF.Delay = make([]int, Count)
			i := 0
			v := Images.Front()
			for i != Count {
				Img := v.Value.(*image.RGBA)
				v = v.Next()
				go func(index int, s *image.RGBA) {
					palleted := image.NewPaletted(s.Bounds(), palette.WebSafe)
					draw.FloydSteinberg.Draw(palleted, s.Rect, s, image.Point{
						X: 0,
						Y: 0,
					})
					GIF.Image[index] = palleted
					wg.Done()
				}(i, Img)
				i++
			}
			wg.Wait()
			err := gif.EncodeAll(&w, &GIF)
			if err != nil {
				sentry.CaptureException(err)
				panic(err)
			}
			return w.Bytes()
		}

		// Add a 30fps frame cap.
		time.Sleep(time.Second / 30)
	}
}
