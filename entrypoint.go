package main

//go:generate go run build_assets.go

import "C"
import "github.com/magiccap/MagicCap/core"

//export Start
func Start() {
	core.Start()
}

func main() {
	Start()
}
