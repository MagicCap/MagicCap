// +build linux
// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

package clipboard

import (
	"github.com/gotk3/gotk3/gdk"
	"github.com/gotk3/gotk3/gtk"
)

// BytesToClipboard is used to place bytes in the clipboard.
func BytesToClipboard(Data []byte, _ string) {
	screen, err := gdk.DisplayGetDefault()
	if err != nil {
		panic(err)
	}
	clipboard, _ := gtk.ClipboardGetForDisplay(screen, gdk.SELECTION_CLIPBOARD)
	PixbufLoader, _ := gdk.PixbufLoaderNew()
	Pixbuf, _ := PixbufLoader.WriteAndReturnPixbuf(Data)
	clipboard.SetImage(Pixbuf)
	clipboard.Store()
}

// StringToClipboard is used to place a string in the clipboard.
func StringToClipboard(Data string) {
	screen, err := gdk.DisplayGetDefault()
	if err != nil {
		panic(err)
	}
	clipboard, _ := gtk.ClipboardGetForDisplay(screen, gdk.SELECTION_CLIPBOARD)
	clipboard.SetText(Data)
	clipboard.Store()
}

// GetClipboard is a function used to get what is inside the clipboard.
func GetClipboard() *ClipboardResult {
	screen, err := gdk.DisplayGetDefault()
	if err != nil {
		panic(err)
	}
	clipboard, _ := gtk.ClipboardGetForDisplay(screen, gdk.SELECTION_CLIPBOARD)
	r := ClipboardResult{}
	e := clipboard.WaitIsTextAvailable()
	if e {
		s, err := clipboard.WaitForText()
		if err != nil {
			return &r
		}
		r.Text = &s
		return &r
	}
	e = clipboard.WaitIsImageAvailable()
	if !e {
		return &r
	}
	i, err := clipboard.WaitForImage()
	if err != nil {
		return &r
	}
	pixels := i.GetPixels()
	r.Data = &pixels
	return &r
}
