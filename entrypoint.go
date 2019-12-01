package main

import (
	"MagicCap3/core"
	"bufio"
	"encoding/json"
	"github.com/faiface/mainthread"
	"github.com/getlantern/systray"
	"github.com/zserge/webview"
	"os"
	"runtime"
)

func main() {
	if os.Getenv("SYSTRAY_MODE") == "true" {
		runtime.LockOSThread()
		systray.Run(core.InitTray, nil)
	} else if os.Getenv("WEBVIEW_MODE") == "true" {
		runtime.LockOSThread()
		var settings webview.Settings
		buf := bufio.NewReader(os.Stdin)
		data, err := buf.ReadBytes('\n')
		if err != nil {
			panic(err)
		}
		err = json.Unmarshal(data, &settings)
		if err != nil {
			panic(err)
		}
		v := webview.New(settings)
		v.Run()
	} else {
		runtime.LockOSThread()
		mainthread.Run(core.Start)
	}
}
