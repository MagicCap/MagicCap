package main

import (
	"bufio"
	"encoding/json"
	"net/url"
	"os"
	"runtime"
	"strings"

	"github.com/faiface/mainthread"
	"github.com/getsentry/sentry-go"
	"github.com/magiccap/MagicCap/core"
	"github.com/zserge/webview"
)

// CoreWindowConfig defines the core window configuration.
type CoreWindowConfig struct {
	WebviewConfig webview.Settings
	RGBA          core.RGBAConfig
	Fullscreen    bool
}

func main() {
	if os.Getenv("WEBVIEW_MODE") == "true" {
		runtime.LockOSThread()
		var settings CoreWindowConfig
		buf := bufio.NewReader(os.Stdin)
		data, err := buf.ReadBytes('\n')
		if err != nil {
			sentry.CaptureException(err)
			panic(err)
		}
		err = json.Unmarshal(data, &settings)
		if err != nil {
			sentry.CaptureException(err)
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
