// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

package core

import (
	"encoding/json"
	"github.com/magiccap/MagicCap/core/clipboard"
	"github.com/magiccap/MagicCap/core/mainthread"
	"github.com/magiccap/MagicCap/core/utils"
	"io/ioutil"
	"net"
	"runtime"
	"strconv"
	"strings"

	"github.com/getsentry/sentry-go"
	"github.com/magiccap/MagicCap/core/webview"
	"github.com/pkg/browser"
	"github.com/sqweek/dialog"

	"github.com/gobuffalo/packr/v2"
	"github.com/matishsiao/goInfo"
	"github.com/valyala/fasthttp"
)

var (
	// ConfigWindow defines the config window.
	ConfigWindow *webview.Webview

	// CSS defines the box containing CSS.
	CSS = packr.New("css", "../config/src/css")

	// Dist defines the folder containing the build.
	Dist = packr.New("dist", "../config/dist")

	// Changes defines if there has been any changes since the capture UI opened.
	Changes *int64

	// CSSBase defines the base for all CSS.
	CSSBase = utils.MustString(CSS, "components/base.css") + "\n" + utils.MustString(CSS, "components/button.css") + "\n" + utils.MustString(CSS, 
		"components/docs.css") + "\n" + utils.MustString(CSS, "components/inputs.css") + "\n" + utils.MustString(CSS, 
		"components/markdown.css") + "\n" + utils.MustString(CSS, "components/menu.css") + "\n" + utils.MustString(CSS, 
		"components/modal.css") + utils.MustString(CSS, "components/scroll.css") + "\n" + utils.MustString(CSS, 
		"components/table.css") + "\n" + utils.MustString(CSS, "components/tooltip.css")
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
	res := utils.MustString(CSS, "bulmaswatch/" + BulmaswatchString + "/bulmaswatch.min.css")
	res += "\n" + CSSBase
	res += "\n" + utils.MustString(CSS, "fontawesome-free/css/all.min.css")
	res += "\n" + utils.MustString(CSS, ThemeString+".css")
	return res
}

// HandleConfigRequest is used to handle requests relating to the config.
func HandleConfigRequest(ctx *fasthttp.RequestCtx) {
	if string(ctx.Method()) == "GET" {
		// Gets the config.
		j, err := json.Marshal(&ConfigItems)
		if err != nil {
			sentry.CaptureException(err)
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
			sentry.CaptureException(err)
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
		sentry.CaptureException(err)
		panic(err)
	}
	ctx.Response.SetStatusCode(200)
	ctx.Response.Header.Set("Content-Type", "application/json; charset=UTF-8")
	ctx.Response.SetBody(j)
}

// DeleteCapturesRoute is a route used to delete a capture.
func DeleteCapturesRoute(ctx *fasthttp.RequestCtx) {
	num, err := strconv.Atoi(string(ctx.Request.Body()))
	if err != nil {
		sentry.CaptureException(err)
		panic(err)
	}
	DeleteCapture(num)
	ctx.Response.SetStatusCode(204)
}

// ChangefeedRoute is a route used to check for changes.
func ChangefeedRoute(ctx *fasthttp.RequestCtx) {
	j, err := json.Marshal(&Changes)
	if err != nil {
		sentry.CaptureException(err)
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
			"type":    OS,
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

// OpenSaveDialog is used to open up a save dialog and save the file specified.
func OpenSaveDialog(Body map[string]string) {
	// Gets the needed parts.
	Title := Body["title"]
	Extension := Body["extension"]
	ExtensionDescription := Body["extensionDescription"]
	Data := Body["data"]

	fp, err := dialog.File().Filter(ExtensionDescription, Extension).Title(Title).Save()
	if err != nil {
		// Ignore this and return.
		return
	}
	_ = ioutil.WriteFile(fp, []byte(Data), 0666)
}

// ReplaceCapturesRoute is used to replace all of the captures with new values.
func ReplaceCapturesRoute(ctx *fasthttp.RequestCtx) {
	var Data []map[string]interface{}
	err := json.Unmarshal(ctx.Request.Body(), &Data)
	if err != nil {
		sentry.CaptureException(err)
		panic(err)
	}
	PurgeCaptures()
	InsertUploads(Data)
	ctx.Response.SetStatusCode(204)
}

// HandleUploaderTest is used to handle the uploader testing route.
func HandleUploaderTest(ctx *fasthttp.RequestCtx) {
	Uploader := string(ctx.Request.Body())
	err := TestUploader(Uploader)
	if err == nil {
		ctx.Response.SetStatusCode(204)
	} else {
		ctx.Response.SetStatusCode(400)
		ctx.Response.Header.Set("Content-Type", "application/json; charset=UTF-8")
		errString := err.Error()
		j, err := json.Marshal(&errString)
		if err != nil {
			sentry.CaptureException(err)
			panic(err)
		}
		ctx.Response.SetBody(j)
	}
}

// ConfigHTTPHandler handles the configs HTTP requests.
func ConfigHTTPHandler(ctx *fasthttp.RequestCtx) {
	Path := string(ctx.Path())

	switch Path {
	// Handle (semi-)static content. Due to the size of this block, it doesn't need it's own function for each route.
	case "/":
		ctx.Response.SetStatusCode(200)
		ctx.Response.Header.Set("Content-Type", "text/html; charset=UTF-8")
		ctx.Response.SetBody(utils.MustBytes(Dist, "index.html"))
		break
	case "/mount.js":
		ctx.Response.SetStatusCode(200)
		ctx.Response.Header.Set("Content-Type", "application/javascript; charset=UTF-8")
		ctx.Response.SetBody(utils.MustBytes(Dist, "mount.js"))
		break
	case "/mount.js.map":
		ctx.Response.SetStatusCode(200)
		ctx.Response.Header.Set("Content-Type", "application/json; charset=UTF-8")
		ctx.Response.SetBody(utils.MustBytes(Dist, "mount.js.map"))
		break
	case "/css":
		ctx.Response.SetStatusCode(200)
		ctx.Response.Header.Set("Content-Type", "text/css; charset=UTF-8")
		ctx.Response.SetBody([]byte(GetCSS()))
		break

	// Handles dynamic content.
	case "/config":
		HandleConfigRequest(ctx)
		break
	case "/captures":
		GetCapturesRoute(ctx)
		break
	case "/changefeed":
		ChangefeedRoute(ctx)
		break
	case "/application_info":
		GetApplicationInfo(ctx)
		break
	case "/uploaders":
		j, err := json.Marshal(&Kernel.Uploaders)
		if err != nil {
			sentry.CaptureException(err)
			panic(err)
		}
		ctx.Response.Header.Set("Content-Type", "application/json; charset=UTF-8")
		ctx.Response.SetStatusCode(200)
		ctx.Response.SetBody(j)
		break

	// Handles ports of Electron functions.
	case "/clipboard":
		clipboard.StringToClipboard(string(ctx.Request.Body()))
		ctx.Response.SetStatusCode(204)
		break
	case "/open/url":
		_ = browser.OpenURL(string(ctx.Request.Body()))
		ctx.Response.SetStatusCode(204)
		break
	case "/open/item":
		_ = browser.OpenFile(string(ctx.Request.Body()))
		ctx.Response.SetStatusCode(204)
		break
	case "/save":
		var Body map[string]string
		err := json.Unmarshal(ctx.Request.Body(), &Body)
		if err != nil {
			sentry.CaptureException(err)
			panic(err)
		}
		go mainthread.ExecMainThread(func() { OpenSaveDialog(Body) })
		ctx.Response.SetStatusCode(204)
		break

	// Handles UI methods.
	case "/call/ShowShort":
		go ShowShort()
		ctx.Response.SetStatusCode(204)
		break
	case "/call/RunScreenCapture":
		go RunScreenCapture()
		ctx.Response.SetStatusCode(204)
		break
	case "/call/RunGIFCapture":
		go RunGIFCapture()
		ctx.Response.SetStatusCode(204)
		break
	case "/call/RunClipboardCapture":
		go RunClipboardCapture()
		ctx.Response.SetStatusCode(204)
		break
	case "/uploader/test":
		HandleUploaderTest(ctx)
		break
	case "/captures/purge":
		PurgeCaptures()
		ctx.Response.SetStatusCode(204)
		break
	case "/captures/delete":
		DeleteCapturesRoute(ctx)
		break
	case "/captures/replace":
		ReplaceCapturesRoute(ctx)
		break
	case "/filename":
		j, err := json.Marshal(GenerateFilename())
		if err != nil {
			sentry.CaptureException(err)
			panic(err)
		}
		ctx.Response.SetStatusCode(200)
		ctx.Response.Header.Set("Content-Type", "application/json; charset=UTF-8")
		ctx.Response.SetBody(j)
		break
	case "/restart":
		ConfigWindow.Exit()
		ConfigWindow = nil
		OpenPreferences()

	// Handles /webfonts and not found.
	default:
		if Path[:9] == "/webfonts" {
			Item := Path[9:]
			ctx.Response.SetStatusCode(200)
			ctx.Response.SetBody(utils.MustBytes(CSS, "fontawesome-free/webfonts" + Item))
		} else {
			ctx.Response.SetStatusCode(404)
			ctx.Response.SetBody([]byte("Not found."))
		}
	}
}

// OpenPreferences opens the preferences.
func OpenPreferences() {
	// Only allow a single instance of the config.
	if ConfigWindow != nil {
		mainthread.ExecMainThread(ConfigWindow.Focus)
		return
	}

	// Create a socket.
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		sentry.CaptureException(err)
		panic(err)
	}

	// Start the fasthttp server.
	go func() {
		err := fasthttp.Serve(ln, ConfigHTTPHandler)
		if err != nil {
			sentry.CaptureException(err)
			panic(err)
		}
	}()

	// Spawn the config and wait for it to die.
	URL := "http://" + ln.Addr().String()
	println("Config opened at " + URL)
	VersionBit := ""
	if strings.Contains(Version, "a") {
		VersionBit = " Alpha"
	} else if strings.Contains(Version, "b") {
		VersionBit = " Beta"
	}
	mainthread.ExecMainThread(func() {
		ConfigWindow = webview.NewWebview(URL, "MagicCap"+VersionBit, 1200, 600, false, false)
	})

	// Wait for the config window.
	ConfigWindow.Wait()

	// Null-ify the config window.
	ConfigWindow = nil

	// Kill the socket.
	err = ln.Close()
	if err != nil {
		sentry.CaptureException(err)
		panic(err)
	}
}
