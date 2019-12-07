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
	if ConfigWindow != nil {
		ConfigWindow.Exit()
	}
	os.Exit(0)
}

// HandleTrayOut handles outputs from the tray.
func HandleTrayOut(line string) {
	if line == "exit" {
		Exit()
	} else if line == "pref" {
		go OpenPreferences()
	} else if line[:6] == "upload" {
		UploaderName := line[6:]
		for _, v := range GetConfiguredUploaders() {
			if v.Uploader.Name == UploaderName {
				go OpenFileUploader(v.Uploader)
			}
		}
	} else if line[:4] == "call" {
		Call := line[4:]
		switch Call {
		case "ShowShort":
			ShowShort()
			break
		case "RunScreenCapture":
			RunScreenCapture()
			break
		case "RunGIFCapture":
			RunGIFCapture()
			break
		case "RunClipboardCapture":
			RunClipboardCapture()
			break
		}
	}
}

// RestartTrayProcess (re)starts the process which is used for the task tray.
func RestartTrayProcess() {
	// Initialises the process.
	app := os.Args[0]
	if TrayProcess != nil {
		_ = TrayProcess.Process.Kill()
	}
	TrayProcess = exec.Command(app)
	TrayProcess.Env = append(os.Environ(), "SYSTRAY_MODE=true")

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
