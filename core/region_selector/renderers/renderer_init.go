package renderers

// RendererInit is used to initialise a renderer at boot.
func RendererInit() {
	x := OSRenderer()
	x.RendererInit()
}
