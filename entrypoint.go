package main

import (
	"MagicCap3/core"
	"github.com/getlantern/systray"
	"os"
	"runtime"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "SYSTRAY_MODE" {
		runtime.LockOSThread()
		systray.Run(core.InitTray, nil)
	} else {
		core.Start()
	}
}
