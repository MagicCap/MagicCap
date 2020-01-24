package main

import (
	"runtime"

	"github.com/faiface/mainthread"
	"github.com/magiccap/MagicCap/core"
)

func main() {
	runtime.LockOSThread()
	mainthread.Run(core.Start)
}
