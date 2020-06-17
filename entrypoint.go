package main

import "C"
import "github.com/magiccap/MagicCap/core"

//export Start
func Start() {
	core.Start()
}

func main() {
	Start()
}
