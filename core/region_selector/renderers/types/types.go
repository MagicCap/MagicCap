package types

import "image"

// Renderer is the interface for the renderers.
type Renderer interface {
	ShouldClose()
	WindowShouldClose(index int) bool
	DestroyAll()
	SetKeyCallback(Function func(Release bool, index, key int))
	SetMousePressCallback(Function func(relX, relY, index int, pos image.Rectangle))
	SetMouseReleaseCallback(Function func(relX, relY, index int, pos image.Rectangle))
	SetPositionChange(Func func(x, y int))
	PollEvents()
	Init(DarkerScreenshots, Screenshots []*image.RGBA) (int64, int64)
	GetDisplayRectangles() []image.Rectangle
	GetDarkerTexture(index int) Texture
	GetNormalTexturePixels(index, Left, Top, W, H int) []uint8
	RenderTexture(index int, t Texture)
	RendererInit()
}

// Texture is used to define a texture type.
type Texture interface {
	Begin()
	End()
	SetPixels(X, Y, Width, Height int, Pix []byte)
	GetWidthHeight() (int, int)
}
