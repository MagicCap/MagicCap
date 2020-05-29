package renderers

import "image"

// Renderer is the interface for the renderers.
type Renderer interface {
	ShouldClose()
	WindowShouldClose(index int) bool
	DestroyAll()
	SetKeyCallback(Function func(Release bool, index, key int))
	SetMousePressCallback(Function func(index int, pos image.Rectangle))
	SetMouseReleaseCallback(Function func(index int, pos image.Rectangle))
	PollEvents()
	Init(Displays []image.Rectangle, DarkerScreenshots, Screenshots []*image.RGBA)
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
