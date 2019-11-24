package main

import (
	"MagicCap3/core"
	"os"
	"runtime"
	"time"

	"github.com/getlantern/systray"
)

// StartTime defines the time of start.
var StartTime time.Time

func main() {
	if len(os.Args) > 1 && os.Args[1] == "SYSTRAY_MODE" {
		runtime.LockOSThread()
		systray.Run(core.InitTray, nil)
	} else {
		StartTime = time.Now()
		core.Start(StartTime)
	}
}
