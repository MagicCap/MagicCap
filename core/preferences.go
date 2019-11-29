package core

import (
	"github.com/gobuffalo/packr"
	"net"
	"net/url"

	"github.com/zserge/webview"
)

var (
	// CSS defines the box containing CSS.
	CSS = packr.NewBox("../config/src/css")

	// dist defines the folder containing the build.
	Dist = packr.NewBox("../config/dist")
)

// OpenPreferences opens the preferences.
func OpenPreferences() {
	//ln, err := net.Listen("tcp", "127.0.0.1:0")
	//if err != nil {
	//	panic(err)
	//}

	defer ln.Close()
	h := SpawnWindowHandler(webview.Settings{
		Title:                  "MagicCap",
		URL:                    "https://google.com",
		Width:                  800,
		Height:                 600,
		Resizable:              true,
	})
	h.Wait()
	println("closed")
}
func _OpenPreferences() {
	view := webview.New(webview.Settings{
		URL:    `data:text/html,` + url.PathEscape(Dist.String("index.html")),
		Width:  800,
		Height: 600,
		Title:  "MagicCap",
	})
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
	view.InjectCSS(CSS.String("bulmaswatch/" + BulmaswatchString + "/bulmaswatch.min.css"))
	view.InjectCSS(CSS.String("main.css"))
	view.InjectCSS(CSS.String(ThemeString + ".css"))
	view.Dispatch(func() {
		JS := Dist.String("mount.js")
		err := view.Eval(JS)
		if err != nil {
			panic(err)
		}
	})
	view.Run()
}
