// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

package core

import (
	"bytes"
	"encoding/json"
	"os"
	"os/exec"

	"github.com/getsentry/sentry-go"
	"github.com/zserge/webview"
)

// WindowHandler is used to define a process being used for handling windows.
type WindowHandler struct {
	Cmd *exec.Cmd
}

// RGBAConfig is the configuration of window colours.
type RGBAConfig struct {
	R uint8
	G uint8
	B uint8
	A uint8
}

// SpawnWindowHandler spawns a process which can open a window.
func SpawnWindowHandler(settings webview.Settings, rgba RGBAConfig, Fullscreen bool) *WindowHandler {
	// Gets the window handler ready.
	j, err := json.Marshal(&map[string]interface{}{
		"WebviewConfig": map[string]interface{}{
			"Width":     settings.Width,
			"Height":    settings.Height,
			"Resizable": settings.Resizable,
			"URL":       settings.URL,
			"Debug":     settings.Debug,
			"Title":     settings.Title,
		},
		"RGBA":       &rgba,
		"Fullscreen": Fullscreen,
	})
	if err != nil {
		sentry.CaptureException(err)
		panic(err)
	}

	app := os.Args[0]
	Process := exec.Command(app)
	Process.Stdin = &bytes.Buffer{}
	Process.Stderr = os.Stderr
	Process.Stdout = os.Stdout
	Process.Env = append(os.Environ(), "WEBVIEW_MODE=true")

	// Starts the process.
	if err := Process.Start(); err != nil {
		sentry.CaptureException(err)
		panic(err)
	}

	// Write the JSON.
	Process.Stdin.(*bytes.Buffer).Write([]byte(string(j) + "\n"))

	// Returns the window handler.
	return &WindowHandler{Cmd: Process}
}

// Exit kills the process.
func (p *WindowHandler) Exit() {
	err := p.Cmd.Process.Kill()
	if err != nil {
		sentry.CaptureException(err)
		panic(err)
	}
}

// Wait is used to wait for the process to die.
func (p *WindowHandler) Wait() {
	_ = p.Cmd.Wait()
}
