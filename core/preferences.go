package core

import (
	platformspecific "MagicCap3/core/platform_specific"
	"encoding/json"
	"github.com/pkg/browser"
	"net"
	"runtime"
	"strconv"
	"strings"

	"github.com/gobuffalo/packr"
	"github.com/matishsiao/goInfo"
	"github.com/valyala/fasthttp"
	"github.com/zserge/webview"
)

// TODO: Single instance only!

var (
	// CSS defines the box containing CSS.
	CSS = packr.NewBox("../config/src/css")

	// Dist defines the folder containing the build.
	Dist = packr.NewBox("../config/dist")

	// Changes defines if there has been any changes since the capture UI opened.
	Changes = false

	// CSSBase defines the base for all CSS.
	CSSBase = CSS.String("components/base.css") + "\n" + CSS.String("components/button.css") + "\n" + CSS.String(
		"components/docs.css") + "\n" + CSS.String("components/inputs.css") + "\n" + CSS.String(
			"components/markdown.css") + "\n" + CSS.String("components/menu.css") + "\n" + CSS.String(
				"components/modal.css") + CSS.String("components/scroll.css") + "\n" + CSS.String(
					"components/table.css") + "\n" + CSS.String("components/tooltip.css")
)

// GetCSS is used to bundle all of the CSS.
func GetCSS() string {
	Theme, ok := ConfigItems["light_theme"].(bool)
	if !ok {
		Theme = false
	}
	ThemeString := "light"
	BulmaswatchString := "default"
	if !Theme {
		ThemeString = "dark"
		BulmaswatchString = "darkly"
	}
	res := CSS.String("bulmaswatch/" + BulmaswatchString + "/bulmaswatch.min.css")
	res += "\n" + CSSBase
	res += "\n" + CSS.String("fontawesome-free/css/all.min.css")
	res += "\n" + CSS.String(ThemeString+".css")
	return res
}

// HandleConfigRequest is used to handle requests relating to the config.
func HandleConfigRequest(ctx *fasthttp.RequestCtx) {
	if string(ctx.Method()) == "GET" {
		// Gets the config.
		j, err := json.Marshal(&ConfigItems)
		if err != nil {
			panic(err)
		}
		ctx.Response.SetStatusCode(200)
		ctx.Response.Header.Set("Content-Type", "application/json; charset=UTF-8")
		ctx.Response.SetBody(j)
	} else {
		// Sets the config.
		ConfigBody := ctx.Request.Body()
		NewConfig := make(map[string]interface{})
		err := json.Unmarshal(ConfigBody, &NewConfig)
		if err != nil {
			panic(err)
		}
		ConfigItems = NewConfig
		UpdateConfig()
		ctx.Response.SetStatusCode(204)
	}
}

// GetCapturesRoute is a route used to get captures.
func GetCapturesRoute(ctx *fasthttp.RequestCtx) {
	caps := GetCaptures()
	j, err := json.Marshal(&caps)
	if err != nil {
		panic(err)
	}
	ctx.Response.SetStatusCode(200)
	ctx.Response.Header.Set("Content-Type", "application/json; charset=UTF-8")
	ctx.Response.SetBody(j)
	Changes = false
}

// DeleteCapturesRoute is a route used to delete a capture.
func DeleteCapturesRoute(ctx *fasthttp.RequestCtx) {
	num, err := strconv.Atoi(string(ctx.Request.Body()))
	if err != nil {
		panic(err)
	}
	DeleteCapture(num)
	ctx.Response.SetStatusCode(204)
}

// ChangefeedRoute is a route used to check for changes.
func ChangefeedRoute(ctx *fasthttp.RequestCtx) {
	j, err := json.Marshal(&Changes)
	if err != nil {
		panic(err)
	}
	ctx.Response.SetStatusCode(200)
	ctx.Response.Header.Set("Content-Type", "application/json; charset=UTF-8")
	ctx.Response.SetBody(j)
}

// GetApplicationInfo is used to get application info for the frontend.
func GetApplicationInfo(ctx *fasthttp.RequestCtx) {
	info := goInfo.GetInfo()
	OS := info.OS
	if OS == "Darwin" {
		OS = "macOS"
	}
	Information := map[string]interface{}{
		"version": Version,
		"os": map[string]string{
			"type": OS,
			"release": info.Core,
		},
		"platform": strings.ToUpper(runtime.GOOS[:1]) + runtime.GOOS[1:],
	}
	j, err := json.Marshal(&Information)
	if err != nil {
		panic(err)
	}
	ctx.Response.SetStatusCode(200)
	ctx.Response.Header.Set("Content-Type", "application/json; charset=UTF-8")
	ctx.Response.SetBody(j)
}

// ConfigHTTPHandler handles the configs HTTP requests.
func ConfigHTTPHandler(ctx *fasthttp.RequestCtx) {
	Path := string(ctx.Path())

	switch Path {
	// Handle (semi-)static content. Due to the size of this block, it doesn't need it's own function for each route.
	case "/":
		ctx.Response.SetStatusCode(200)
		ctx.Response.Header.Set("Content-Type", "text/html; charset=UTF-8")
		ctx.Response.SetBody(Dist.Bytes("index.html"))
	case "/js":
		ctx.Response.SetStatusCode(200)
		ctx.Response.Header.Set("Content-Type", "application/javascript; charset=UTF-8")
		ctx.Response.SetBody(Dist.Bytes("mount.js"))
	case "/css":
		ctx.Response.SetStatusCode(200)
		ctx.Response.Header.Set("Content-Type", "text/css; charset=UTF-8")
		ctx.Response.SetBody([]byte(GetCSS()))

	// Handles dynamic content.
	case "/config":
		HandleConfigRequest(ctx)
	case "/captures":
		GetCapturesRoute(ctx)
	case "/changefeed":
		ChangefeedRoute(ctx)
	case "/application_info":
		GetApplicationInfo(ctx)

	// Handles ports of Electron functions.
	case "/clipboard":
		platformspecific.StringToClipboard(string(ctx.Request.Body()))
		ctx.Response.SetStatusCode(204)
	case "/open/url":
		_ = browser.OpenURL(string(ctx.Request.Body()))
		ctx.Response.SetStatusCode(204)
	case "/open/item":
		_ = browser.OpenFile(string(ctx.Request.Body()))
		ctx.Response.SetStatusCode(204)

	// Handles UI methods.
	case "/captures/delete":
		DeleteCapturesRoute(ctx)
	case "/filename":
		j, err := json.Marshal(GenerateFilename())
		if err != nil {
			panic(err)
		}
		ctx.Response.SetStatusCode(200)
		ctx.Response.Header.Set("Content-Type", "application/json; charset=UTF-8")
		ctx.Response.SetBody(j)

	// Handles /webfonts
	default:
		if Path[:9] == "/webfonts" {
			Item := Path[9:]
			ctx.Response.SetStatusCode(200)
			ctx.Response.SetBody(CSS.Bytes("fontawesome-free/webfonts" + Item))
		}
	}
}

// OpenPreferences opens the preferences.
func OpenPreferences() {
	// Create a socket.
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		panic(err)
	}

	// Start the fasthttp server.
	go func() {
		err := fasthttp.Serve(ln, ConfigHTTPHandler)
		if err != nil {
			panic(err)
		}
	}()

	// Spawn the config and wait for it to die.
	URL := "http://" + ln.Addr().String()
	println("Config opened at " + URL)
	h := SpawnWindowHandler(webview.Settings{
		Title:     "MagicCap",
		URL:       URL,
		Width:     1200,
		Height:    600,
		Resizable: false,
	})
	h.Wait()

	// Kill the socket.
	err = ln.Close()
	if err != nil {
		panic(err)
	}
}
