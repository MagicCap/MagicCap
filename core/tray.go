// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

package core

import (
	"os"

	"github.com/getlantern/systray"
	"github.com/getsentry/sentry-go"
)

// InitMainTray Initialises the tray.
func InitMainTray() {
	// Load the uploaders kernel and get config options.
	LoadUploadersKernel()
	GetConfigItems()

	// Sets the tray icon.
	b, err := CoreAssets.Find("taskbar@2x.png")
	if err != nil {
		sentry.CaptureException(err)
		panic(err)
	}
	systray.SetIcon(b)

	// Add functionality button.
	FullscreenCapButton := systray.AddMenuItem("Fullscreen Capture", "Used to capture the whole screen.")
	ScreenCapButton := systray.AddMenuItem("Screen Capture", "Used to capture what is on the screen.")
	GIFCapButton := systray.AddMenuItem("GIF Capture", "Used to capture what is on the screen as a GIF.")
	ClipboardCaptureButton := systray.AddMenuItem("Clipboard Capture", "Used to capture and upload what is in the clipboard.")
	ShortButton := systray.AddMenuItem("Link Shortener", "Opens the link shortener.")

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
		case <-FullscreenCapButton.ClickedCh:
			_, _ = os.Stdout.Write([]byte("callRunFullscreenCapture\n"))
		case <-ShortButton.ClickedCh:
			_, _ = os.Stdout.Write([]byte("callShowShort\n"))
		case <-ScreenCapButton.ClickedCh:
			_, _ = os.Stdout.Write([]byte("callRunScreenCapture\n"))
		case <-GIFCapButton.ClickedCh:
			_, _ = os.Stdout.Write([]byte("callRunGIFCapture\n"))
		case <-ClipboardCaptureButton.ClickedCh:
			_, _ = os.Stdout.Write([]byte("callRunClipboardCapture\n"))
		case <-Quit.ClickedCh:
			_, _ = os.Stdout.Write([]byte("exit\n"))
		case <-Preferences.ClickedCh:
			_, _ = os.Stdout.Write([]byte("pref\n"))
		}
	}
}
