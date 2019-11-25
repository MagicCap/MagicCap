package core

import "github.com/zserge/webview"

// OpenPreferences opens the preferences.
func OpenPreferences() {
	ThreadSafeWebview(webview.Settings{
		URL:    "https://google.com",
		Width:  800,
		Height: 600,
		Title:  "MagicCap",
	})
}
