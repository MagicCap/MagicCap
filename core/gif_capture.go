package core

import (
	"bytes"
	"container/list"
	"image"
	"image/color/palette"
	"image/draw"
	"image/gif"
	"runtime/debug"
	"sync"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/kbinani/screenshot"
)

func gifEncoder(wg *sync.WaitGroup, Images *list.List) []byte {
	// Switch off the GC for a bit. Performance is paramount here.
	debug.SetGCPercent(-1)
	defer debug.SetGCPercent(100)

	GIF := gif.GIF{}
	w := bytes.Buffer{}
	wg.Wait()
	Count := Images.Len()
	wg.Add(Count)
	GIF.Image = make([]*image.Paletted, Count)
	b := Images.Front().Value.(*image.RGBA).Bounds()
	PaletteChan := make(chan *image.Paletted)
	for range GIF.Image {
		go func() {
			PaletteChan <- image.NewPaletted(b, palette.WebSafe)
		}()
	}
	for i := range GIF.Image {
		GIF.Image[i] = <-PaletteChan
	}
	GIF.Delay = make([]int, Count)
	i := 0
	v := Images.Front()
	for i != Count {
		Img := v.Value.(*image.RGBA)
		v = v.Next()
		go func(index int, s *image.RGBA) {
			draw.Src.Draw(GIF.Image[index], s.Rect, s, image.Point{})
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
			return gifEncoder(&wg, Images)
		}

		// Add a 30fps frame cap.
		time.Sleep(time.Second / 30)
	}
}
