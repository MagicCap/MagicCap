package main

import (
	"bufio"
	"encoding/json"
	"github.com/MagicCap/MagicCap/core"
	"github.com/faiface/mainthread"
	"github.com/getlantern/systray"
	"github.com/zserge/webview"
	"net/url"
	"os"
	"runtime"
	"strings"
)

// CoreWindowConfig defines the core window configuration.
type CoreWindowConfig struct {
	WebviewConfig webview.Settings
	RGBA core.RGBAConfig
	Fullscreen bool
}

func main() {
	if os.Getenv("SYSTRAY_MODE") == "true" {
		runtime.LockOSThread()
		systray.Run(core.InitTray, nil)
	} else if os.Getenv("WEBVIEW_MODE") == "true" {
		runtime.LockOSThread()
		var settings CoreWindowConfig
		buf := bufio.NewReader(os.Stdin)
		data, err := buf.ReadBytes('\n')
		if err != nil {
			panic(err)
		}
		err = json.Unmarshal(data, &settings)
		if err != nil {
			panic(err)
		}
		if settings.WebviewConfig.URL == "__SHORTENER__" {
			HTML := strings.Replace(core.CoreAssets.String("shortener.html"), "inline_styling", core.CSS.String(
				"bulmaswatch/darkly/bulmaswatch.min.css"), 1)
			settings.WebviewConfig.URL = `data:text/html,` + url.PathEscape(HTML)
		}
		v := webview.New(settings.WebviewConfig)
		v.SetColor(settings.RGBA.R, settings.RGBA.G, settings.RGBA.B, settings.RGBA.A)
		v.SetFullscreen(settings.Fullscreen)
		v.Run()
	} else {
		runtime.LockOSThread()
		mainthread.Run(core.Start)
	}
}
