// +build linux
// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

package platformspecific

import (
	"io/ioutil"
	"os"
	"path"
	"time"

	"github.com/dawidd6/go-appindicator"
	"github.com/gobuffalo/packr"
	"github.com/gotk3/gotk3/gtk"
)

// TaskbarAssets is used to get assets for the taskbar.
var TaskbarAssets = packr.NewBox("../../assets/taskbar")

// ConfiguredHandlers are all of the handlers in use.
var ConfiguredHandlers map[string]func()

// CurrentIndicator is the currently used indicator.
var CurrentIndicator *appindicator.Indicator

// InitTray is used to initialise the tray.
func InitTray(Uploaders []string, Slugs []string, Handlers map[string]func()) {
	// Create the menu.
	menu, err := gtk.MenuNew()
	if err != nil {
		panic(err)
	}

	// Add the "Fullscreen Capture" button.
	m, err := gtk.MenuItemNew()
	if err != nil {
		panic(err)
	}
	m.SetLabel("Fullscreen Capture")
	m.Connect("activate", func() {
		go Handlers["fullscreen"]()
	})
	menu.Append(m)

	// Add the "Screen Capture" button.
	m, err = gtk.MenuItemNew()
	if err != nil {
		panic(err)
	}
	m.SetLabel("Screen Capture")
	m.Connect("activate", func() {
		go Handlers["screen"]()
	})
	menu.Append(m)

	// Add the "GIF Capture" button.
	m, err = gtk.MenuItemNew()
	if err != nil {
		panic(err)
	}
	m.SetLabel("GIF Capture")
	m.Connect("activate", func() {
		go Handlers["gif"]()
	})
	menu.Append(m)

	// Add the "Clipboard Capture" button.
	m, err = gtk.MenuItemNew()
	if err != nil {
		panic(err)
	}
	m.SetLabel("Clipboard Capture")
	m.Connect("activate", func() {
		go Handlers["clipboard"]()
	})
	menu.Append(m)

	// Add the "Link Shortener" button.
	m, err = gtk.MenuItemNew()
	if err != nil {
		panic(err)
	}
	m.SetLabel("Link Shortener")
	m.Connect("activate", func() {
		go Handlers["short"]()
	})
	menu.Append(m)

	// Add a seperator.
	s, err := gtk.SeparatorMenuItemNew()
	if err != nil {
		panic(err)
	}
	menu.Append(s)

	// Create the "Upload to..." sub-menu.
	m, err = gtk.MenuItemNew()
	if err != nil {
		panic(err)
	}
	m.SetLabel("Upload to...")
	submenu, err := gtk.MenuNew()
	if err != nil {
		panic(err)
	}
	for i, v := range Slugs {
		subitem, err := gtk.MenuItemNew()
		if err != nil {
			panic(err)
		}
		subitem.Connect("activate", func() {
			go Handlers["upload"+v]()
		})
		subitem.SetLabel("Upload file to " + Uploaders[i])
		submenu.Append(subitem)
	}
	m.SetSubmenu(submenu)
	menu.Append(m)

	// Add a seperator.
	s, err = gtk.SeparatorMenuItemNew()
	if err != nil {
		panic(err)
	}
	menu.Append(s)

	// Add the "Preferences..." option.
	m, err = gtk.MenuItemNew()
	if err != nil {
		panic(err)
	}
	m.SetLabel("Preferences...")
	m.Connect("activate", func() {
		go Handlers["pref"]()
	})
	menu.Append(m)

	// Add the "Quit" option.
	m, err = gtk.MenuItemNew()
	if err != nil {
		panic(err)
	}
	m.SetLabel("Quit")
	m.Connect("activate", func() {
		Handlers["quit"]()
	})
	menu.Append(m)

	if CurrentIndicator == nil {
		// HACK: We can't pass bytes to appindicator, so temp save the icon and load it.
		// After 10 seconds we delete it. The application will be loaded by then anyway (I would've thought it'd crash if it hung for 10 seconds).
		Icon := TaskbarAssets.Bytes("icon.png")
		TempDir, err := ioutil.TempDir("", "magiccap_icon")
		if err != nil {
			panic(err)
		}
		Path := path.Join(TempDir, "icon.png")
		err = ioutil.WriteFile(Path, Icon, 0664)
		if err != nil {
			panic(err)
		}
		go func() {
			time.Sleep(time.Second * 10)
			os.RemoveAll(TempDir)
		}()

		// Create the indicator (tray icon).
		CurrentIndicator = appindicator.New("magiccap-core", Path, appindicator.CategoryApplicationStatus)

		// Set the title to "MagicCap".
		CurrentIndicator.SetTitle("MagicCap")

		// Set the status to active.
		CurrentIndicator.SetStatus(appindicator.StatusActive)
	}

	// Set the menu.
	CurrentIndicator.SetMenu(menu)

	// Show the menu.
	menu.ShowAll()
}
