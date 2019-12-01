package core

import (
	"bytes"
	"encoding/json"
	"github.com/zserge/webview"
	"os"
	"os/exec"
)

// WindowHandler is used to define a process being used for handling windows.
type WindowHandler struct {
	Cmd *exec.Cmd
}

// SpawnWindowHandler spawns a process which can open a window.
func SpawnWindowHandler(settings webview.Settings) *WindowHandler {
	// Gets the window handler ready.
	j, err := json.Marshal(&map[string]interface{}{
		"Width": settings.Width,
		"Height": settings.Height,
		"Resizable": settings.Resizable,
		"URL": settings.URL,
		"Debug": settings.Debug,
		"Title": settings.Title,
	})
	if err != nil {
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
		panic(err)
	}

	// Write the JSON.
	Process.Stdin.(*bytes.Buffer).Write([]byte(string(j) + "\n"))

	// Returns the window handler.
	return &WindowHandler{Cmd:Process}
}

// Exit kills the process.
func (p *WindowHandler) Exit() {
	err := p.Cmd.Process.Kill()
	if err != nil {
		panic(err)
	}
}

// Wait is used to wait for the process to die.
func (p *WindowHandler) Wait() {
	_ = p.Cmd.Wait()
}
