package magnifier

import (
	"github.com/MagicCap/glhf"
	"image"
	"sync"
	"time"
)

// Magnifier defines the magnifier.
type Magnifier struct {
	imgLock sync.Mutex
	img []byte
	originTexture *glhf.Texture
	pos *image.Point
	lastPos *image.Point
	posLock sync.Mutex
	kill bool
	killLock sync.Mutex
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
	b = drawGrid(b, WhiteGrid, scale, resultW, resultH)

	// Lock the image lock.
	m.imgLock.Lock()

	// Set the texture.
	m.img = b

	// Unlock the image lock.
	m.imgLock.Unlock()
}

// Kill is used to kill the magnifier.
func (m *Magnifier) Kill() {
	m.killLock.Lock()
	m.kill = true
	m.killLock.Unlock()
}

// GetFrame is used to get the frame from the magnifier.
func (m *Magnifier) GetFrame() []byte {
	m.imgLock.Lock()
	img := m.img
	m.imgLock.Unlock()
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

// Get information about the texture.
func (m *Magnifier) getTextureInformation() {
	m.originWidth = m.originTexture.Width()
	m.originHeight = m.originTexture.Height()
}

// NewMagnifier is used to create a new version of the magnifier.
func NewMagnifier(origin *glhf.Texture, InitPos *image.Point) *Magnifier {
	m := Magnifier{originTexture: origin, pos: InitPos}
	m.getTextureInformation()
	d := func() bool {
		m.posLock.Lock()
		p := m.pos
		lp := m.lastPos
		if p == nil {
			m.posLock.Unlock()
			if m.img == nil {
				m.imgLock.Lock()
				i := image.NewRGBA(image.Rect(0, 0, 200, 200))
				m.img = i.Pix
				m.imgLock.Unlock()
			}
			return false
		}
		if lp != nil && lp.Y == p.Y && lp.X == p.X {
			m.posLock.Unlock()
			return false
		}
		m.lastPos = p
		x := p.X
		y := p.Y
		m.posLock.Unlock()
		m.killLock.Lock()
		if m.kill {
			m.killLock.Unlock()
			return true
		}
		m.killLock.Unlock()
		m.draw(x, y, 200, 200, 10)
		return false
	}
	d()
	go func() {
		for {
			// Add a 30fps cap to this.
			time.Sleep(time.Second / 30)
			if d() {
				return
			}
		}
	}()
	return &m
}
