package main

import (
	"github.com/MagicCap/MagicCap/core"
	"bufio"
	"encoding/json"
	"github.com/faiface/mainthread"
	"github.com/getlantern/systray"
	"github.com/zserge/webview"
	"net/url"
	"os"
	"runtime"
	"strings"
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
		if settings.URL == "__SHORTENER__" {
			HTML := strings.Replace(core.Assets.String("shortener.html"), "inline_styling", core.CSS.String(
				"bulmaswatch/darkly/bulmaswatch.min.css"), 1)
			settings.URL = `data:text/html,` + url.PathEscape(HTML)
		}
		v := webview.New(settings)
		v.SetColor(0,0, 0,255)
		v.Run()
	} else {
		runtime.LockOSThread()
		mainthread.Run(core.Start)
	}
}
