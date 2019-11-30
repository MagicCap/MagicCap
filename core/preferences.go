package core

import (
	"encoding/json"
	"net"

	"github.com/gobuffalo/packr"
	"github.com/valyala/fasthttp"
	"github.com/zserge/webview"
)

var (
	// CSS defines the box containing CSS.
	CSS = packr.NewBox("../config/src/css")

	// Dist defines the folder containing the build.
	Dist = packr.NewBox("../config/dist")

	// Changes defines if there has been any changes since the capture UI opened.
	Changes = false
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
	res += "\n" + CSS.String("fontawesome-free/css/all.min.css")
	res += "\n" + CSS.String("main.css")
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
		NewConfig := make(map[string]interface{})
		err := json.Unmarshal(ctx.Request.Body(), &NewConfig)
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
		Width:     1050,
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
