package magiccap

import (
	"github.com/gen2brain/beeep"
	"github.com/getlantern/systray"
	"github.com/sqweek/dialog"
	"io/ioutil"
	MagicCapKernelStandards "magiccap-uploaders-kernel/standards"
	"os"
	"path/filepath"
)

// OpenFileUploader opens a file uploader.
func OpenFileUploader(Uploader *MagicCapKernelStandards.Uploader) {
	fp, err := dialog.File().Title("Select the file to upload.").Load()
	if err != nil {
		return
	}
	b, err := ioutil.ReadFile(fp)
	if err != nil {
		dialog.Message("%s", err.Error()).Error()
		return
	}
	Upload(b, filepath.Base(fp), &fp, Uploader)
	_ = beeep.Alert("MagicCap", "File uploaded successfully.", "./assets/taskbar@2x.png")
}

// InitTray Initialises the tray.
func InitTray() {
	// TODO: Dynamically update.
	// Sets the tray icon.
	b, err := ioutil.ReadFile("./assets/taskbar@2x.png")
	if err != nil {
		panic(err)
	}
	systray.SetIcon(b)

	// Adds a "Upload file to..." category.
	systray.AddSeparator()
	for _, v := range GetConfiguredUploaders() {
		ItemCpy := v.Uploader
		Item := systray.AddMenuItem("Upload file to " + v.Name, "Uploads a file to the uploader specified.")
		go func() {
			for {
				<-Item.ClickedCh
				go OpenFileUploader(ItemCpy)
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
			os.Exit(0)
		case <-Preferences.ClickedCh:
			go OpenPreferences()
		}
	}
}
