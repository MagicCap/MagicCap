package magnifier

import (
	"github.com/magiccap/MagicCap/core/region_selector/renderers"
	"image"
	"sync"
	"sync/atomic"
	"time"
)

// Magnifier defines the magnifier.
type Magnifier struct {
	imgLock sync.RWMutex
	img []byte
	index int
	renderer renderers.Renderer
	pos *image.Point
	posLock sync.RWMutex
	kill uintptr
	originWidth int
	originHeight int
}

// Used to draw the image. This should be rate limited to something like 60fps.
func (m *Magnifier) draw(x, y, resultW, resultH, scale int) {
	// Get the region.
	RegionPixels := m.getOriginRegion(resultW/scale, resultH/scale, x, y)

	// Get the scaled texture.
	b := scaleBytes(RegionPixels, scale, resultH/scale)

	// Check if we should use a white grid.
	WhiteGrid := isImageDarker(b)

	// Draws the grid.
	b = drawGridCached(b, WhiteGrid, scale, resultW, resultH)

	// Lock the image lock.
	m.imgLock.Lock()

	// Set the texture.
	m.img = b

	// Unlock the image lock.
	m.imgLock.Unlock()
}

// Kill is used to kill the magnifier.
func (m *Magnifier) Kill() {
	atomic.StoreUintptr(&m.kill, 1)
}

// GetFrame is used to get the frame from the magnifier.
func (m *Magnifier) GetFrame() []byte {
	m.imgLock.RLock()
	img := m.img
	m.imgLock.RUnlock()
	return img
}

// SetPos is used to set the position on a magnifier.
func (m *Magnifier) SetPos(x, y int) {
	m.posLock.Lock()
	m.pos = &image.Point{
		X: x,
		Y: y,
	}
	m.posLock.Unlock()
}

// NewMagnifier is used to create a new version of the magnifier.
func NewMagnifier(renderer renderers.Renderer, index int, width, height int, InitPos *image.Point) *Magnifier {
	m := Magnifier{renderer: renderer, index: index, pos: InitPos}
	m.originHeight = height
	m.originWidth = width
	var lastPos *image.Point
	d := func() bool {
		m.posLock.RLock()
		defer m.posLock.RUnlock()
		if m.pos == nil {
			if m.img == nil {
				i := image.NewRGBA(image.Rect(0, 0, 200, 200))
				m.imgLock.Lock()
				m.img = i.Pix
				m.imgLock.Unlock()
			}
			return false
		}
		if lastPos != nil && lastPos.Y == m.pos.Y && lastPos.X == m.pos.X {
			return false
		}
		lastPos = m.pos
		x := m.pos.X
		y := m.pos.Y
		if atomic.LoadUintptr(&m.kill) == 1 {
			return true
		}
		m.draw(x, y, 200, 200, 10)
		return false
	}
	d()
	duration := time.Second / 30
	var f func()
	f = func() {
		if !d() {
			time.AfterFunc(duration, f)
		}
	}
	time.AfterFunc(duration, f)
	return &m
}
