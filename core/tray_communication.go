package core

import (
	"io"
	"os"
	"os/exec"
)

// TrayProcess defines the process which is running the tray.
var TrayProcess *exec.Cmd

// Exit properly exits the app.
func Exit() {
	_ = TrayProcess.Process.Kill()
	os.Exit(0)
}

// HandleTrayOut handles outputs from the tray.
func HandleTrayOut(line string) {
	if line == "exit" {
		Exit()
	} else if line == "pref" {
		go OpenPreferences()
	}
}

// RestartTrayProcess (re)starts the process which is used for the task tray.
func RestartTrayProcess() {
	// Initialises the process.
	app := os.Args[0]
	if TrayProcess != nil {
		_ = TrayProcess.Process.Kill()
	}
	TrayProcess = exec.Command(app, "SYSTRAY_MODE")

	// Handles stderr.
	TrayProcess.Stderr = os.Stderr

	// Handles stdout pipe.
	stdout, err := TrayProcess.StdoutPipe()
	if err != nil {
		panic(err)
	}

	// Starts the process.
	if err := TrayProcess.Start(); err != nil {
		panic(err)
	}
	println("Tray initialised.")

	// Handles bytes of data.
	Data := make([]byte, 0)
	HandleData := func(OutByte byte) {
		if OutByte == 0x0A {
			// This is a new line.
			HandleTrayOut(string(Data))
			Data = make([]byte, 0)
			return
		}
		Data = append(Data, OutByte)
	}

	// Handles the stdout event.
	go func() {
		Out := make([]byte, 1)
		for {
			n, err := stdout.Read(Out)
			if err == io.EOF {
				break
			} else if err != nil {
				panic(err)
			}
			if n != 0 {
				OutByte := Out[0]
				Out = make([]byte, 1)
				HandleData(OutByte)
			}
		}
	}()
}
