// +build linux

// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

package tempicon

import (
	"github.com/dawidd6/go-appindicator"
	"github.com/gotk3/gotk3/gtk"
	"io/ioutil"
	"os"
	"path"
	"sync"
)

// Defines the lock and current indicator.
var (
	currentIndicator *appindicator.Indicator
	currentIndicatorLock = sync.Mutex{}
)

// TempIcon is the structure which is used for a temp icon.
type TempIcon struct {}

// CloseIcon is used to close the icon.
func (t *TempIcon) CloseIcon() {
	currentIndicator.SetStatus(appindicator.StatusPassive)
	currentIndicatorLock.Unlock()
}

// InitTempIcon is used to initialise the temp icon.
func InitTempIcon(Icon []byte, Handler func(), Message string) *TempIcon {
	// Lock the temp icon.
	currentIndicatorLock.Lock()

	// HACK: We can't pass bytes to appindicator, so temp save the icon and load it.
	// After 10 seconds we delete it. The application will be loaded by then anyway (I would've thought it'd crash if it hung for 10 seconds).
	TempDir, err := ioutil.TempDir(os.Getenv("TMPDIR"), "magiccap_icon")
	if err != nil {
		panic(err)
	}
	Path := path.Join(TempDir, "icon.png")
	err = ioutil.WriteFile(Path, Icon, 0666)
	if err != nil {
		panic(err)
	}

	// Create the menu.
	menu, err := gtk.MenuNew()
	if err != nil {
		panic(err)
	}

	// Create the indicator (tray icon).
	if currentIndicator == nil {
		currentIndicator = appindicator.New("magiccap-temp-icon", "", appindicator.CategoryApplicationStatus)
	}

	// Set the icon.
	currentIndicator.SetIcon(Path)

	// Set the status to active.
	currentIndicator.SetStatus(appindicator.StatusActive)

	// Set the menu item.
	// TODO: This is disgusting. It would be *SUPER* cool if this could be a click event in the future.
	// TODO-2: Unfortunately, we hit the same issue right now as the Election team.
	if Message != "" {
		m, err := gtk.MenuItemNew()
		if err != nil {
			panic(err)
		}
		m.SetLabel(Message)
		menu.Add(m)

		// Set the click handler.
		_, err = m.Connect("activate", func() {
			menu.Deactivate()
			Handler()
		})
		if err != nil {
			panic(err)
		}
		currentIndicator.SetSecondaryActivateTarget(m)
	}

	// Set the menu.
	currentIndicator.SetMenu(menu)

	// Show the menu.
	menu.ShowAll()

	// Return the menu item.
	return &TempIcon{}
}
