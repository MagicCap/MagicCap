package main

//go:generate go run build_assets.go

import "github.com/magiccap/MagicCap/core"

func main() {
	core.Start()
}
