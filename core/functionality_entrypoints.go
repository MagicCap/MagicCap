// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email 2019.

package core

import (
	"bytes"
	"github.com/MagicCap/MagicCap/core/platform_specific"
	"github.com/MagicCap/MagicCap/core/region_selector"
	"github.com/h2non/filetype"
	"github.com/sqweek/dialog"
	"github.com/zserge/webview"
	"golang.org/x/image/tiff"
	"image/png"
	"sync"
	"time"
)

// TODO: A bug is somewhere in this codebase where open windows are not focused. It isn't here, but it needs patching!

var (
	// ShortenerWindows defines all of the shorteners open.
	ShortenerWindows = make([]*WindowHandler, 0)

	// ShortenerWindowsLock is the R/W lock used.
	ShortenerWindowsLock = sync.RWMutex{}
)

// ShowShort shows the shortener screen.
func ShowShort() {
	s := SpawnWindowHandler(webview.Settings{
		Title:                  "MagicCap Link Shortener",
		URL:                    "__SHORTENER__",
		Width:                  500,
		Height:                 200,
		Resizable:              false,
	}, RGBAConfig{
		R: 0,
		G: 0,
		B: 0,
		A: 255,
	}, false)
	ShortenerWindowsLock.Lock()
	ShortenerWindows = append(ShortenerWindows, s)
	ShortenerWindowsLock.Unlock()
	go func() {
		s.Wait()
		var LastIndex int
		ShortenerWindowsLock.Lock()
		for i, k := range ShortenerWindows {
			if k == s {
				LastIndex = i
			}
		}
		ShortenerWindows[LastIndex] = ShortenerWindows[len(ShortenerWindows)-1]
		ShortenerWindows = ShortenerWindows[:len(ShortenerWindows)-1]
		ShortenerWindowsLock.Unlock()
	}()
}

// RunScreenCapture runs a screen capture.
func RunScreenCapture() {
	r := regionselector.OpenRegionSelector()
	if r == nil {
		return
	}
	w := new(bytes.Buffer)
	err := png.Encode(w, r.Selection)
	if err != nil {
		dialog.Message("%s", err.Error()).Error()
		return
	}
	Filename := GenerateFilename() + ".png"
	Default := GetConfiguredUploaders()[0].Uploader
	UploadCapture, _ := ConfigItems["upload_capture"].(bool)
	if !UploadCapture {
		Default = nil
	}
	Upload(w.Bytes(), Filename, nil, Default)
	// TODO: Implement native notifications!
}

// RunGIFCapture runs a GIF capture.
func RunGIFCapture() {
	r := regionselector.OpenRegionSelector()
	if r == nil {
		return
	}
	channel := make(chan bool)
	// TODO: Add manual control!
	go func() {
		time.Sleep(time.Second * 10)
		channel <- true
	}()
	b := NewGIFCapture(&r.Selection.Rect, channel)
	Filename := GenerateFilename() + ".gif"
	Default := GetConfiguredUploaders()[0].Uploader
	UploadCapture, _ := ConfigItems["upload_capture"].(bool)
	if !UploadCapture {
		Default = nil
	}
	Upload(b, Filename, nil, Default)
}

// RunClipboardCapture runs a clipboard capture.
func RunClipboardCapture() {
	c := platformspecific.GetClipboard()
	FileType := "txt"
	var Data []byte
	if c.Text == nil {
		Data = *c.Data
		f, _ := filetype.Match(Data)
		if f == filetype.Unknown {
			// We do not know the MIME type. RIP.
			dialog.Message("%s", "File type not supported.").Error()
			return
		}
		if f.MIME.Value == "image/tiff" {
			// We should convert this to PNG for compatibility.
			FileType = "png"
			img, err := tiff.Decode(bytes.NewReader(Data))
			if err != nil {
				dialog.Message("%s", err.Error()).Error()
				return
			}
			w := new(bytes.Buffer)
			err = png.Encode(w, img)
			if err != nil {
				dialog.Message("%s", err.Error()).Error()
				return
			}
			Data = w.Bytes()
		} else {
			// This is ok to pass in.
			FileType = f.Extension
		}
	} else {
		Data = []byte(*c.Text)
	}
	Default := GetConfiguredUploaders()[0].Uploader
	UploadCapture, _ := ConfigItems["upload_capture"].(bool)
	if !UploadCapture {
		Default = nil
	}
	Filename := GenerateFilename() + "." + FileType
	Upload(Data, Filename, nil, Default)
	// TODO: Implement native notifications!
}
