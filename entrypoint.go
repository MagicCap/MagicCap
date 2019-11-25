package main

import (
	"MagicCap3/core"
	"os"
	"runtime"

	"github.com/faiface/mainthread"
	"github.com/getlantern/systray"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "SYSTRAY_MODE" {
		runtime.LockOSThread()
		systray.Run(core.InitTray, nil)
	} else {
		mainthread.Run(core.Start)
	}
}
