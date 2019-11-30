package core

import (
	"github.com/getlantern/systray"
	"os"
)

// InitTray Initialises the tray.
func InitTray() {
	// Load the uploaders kernel and get config options.
	LoadUploadersKernel()
	GetConfigItems()

	// Sets the tray icon.
	b, err := Assets.Find("taskbar@2x.png")
	if err != nil {
		panic(err)
	}
	systray.SetIcon(b)

	// Adds a "Upload file to..." category.
	systray.AddSeparator()
	for _, v := range GetConfiguredUploaders() {
		ItemCpy := v.Uploader
		Item := systray.AddMenuItem("Upload file to "+v.Name, "Uploads a file to the uploader specified.")
		go func() {
			for {
				<-Item.ClickedCh
				_, _ = os.Stdout.Write([]byte("upload" + ItemCpy.Name + "\n"))
			}
		}()
	}
	systray.AddSeparator()

	// Sets the "Preferences..." button.
	Preferences := systray.AddMenuItem("Preferences...", "Access the MagicCap preferences.")

	// Sets the "Quit" button.
	Quit := systray.AddMenuItem("Quit", "Quits the application.")

	// Handles all of the other events.
	for {
		select {
		case <-Quit.ClickedCh:
			_, _ = os.Stdout.Write([]byte("exit\n"))
		case <-Preferences.ClickedCh:
			_, _ = os.Stdout.Write([]byte("pref\n"))
		}
	}
}
