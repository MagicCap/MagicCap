// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

package core

import (
	"bytes"
	"github.com/getsentry/sentry-go"
	"github.com/h2non/filetype"
	"github.com/magiccap/MagicCap/core/clipboard"
	displaymanagement "github.com/magiccap/MagicCap/core/display_management"
	"github.com/magiccap/MagicCap/core/mainthread"
	"github.com/magiccap/MagicCap/core/notifications"
	regionselector "github.com/magiccap/MagicCap/core/region_selector"
	"github.com/magiccap/MagicCap/core/tempicon"
	"github.com/magiccap/MagicCap/core/utils"
	"github.com/magiccap/MagicCap/core/webview"
	"github.com/sqweek/dialog"
	"golang.org/x/image/tiff"
	"image/png"
	"net/url"
	"strings"
	"sync"
)

var (
	// ShortenerWindows defines all of the shorteners open.
	ShortenerWindows = make([]*webview.Webview, 0)

	// ShortenerWindowsLock is the R/W lock used.
	ShortenerWindowsLock = sync.RWMutex{}
)

// ShowShort shows the shortener screen.
func ShowShort() {
	HTML := strings.Replace(utils.MustString(CoreAssets, "shortener.html"), "inline_styling", utils.MustString(
		CSS, "bulmaswatch/darkly/bulmaswatch.min.css"), 1)
	URL := `data:text/html,` + url.PathEscape(HTML)
	var s *webview.Webview
	mainthread.ExecMainThread(func() {
		s = webview.NewWebview(URL, "MagicCap Link Shortener", 500, 200, false, true)
	})
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

// RunFullscreenCapture runs a fullscreen capture.
func RunFullscreenCapture() {
	img := displaymanagement.StitchAllDisplays()
	w := new(bytes.Buffer)
	err := png.Encode(w, img)
	if err != nil {
		mainthread.ExecMainThread(func() {
			dialog.Message("%s", err.Error()).Error()
		})
		sentry.CaptureException(err)
		return
	}
	Filename := GenerateFilename() + ".png"
	Default := GetConfiguredUploaders()[0].Uploader
	UploadCapture, ok := ConfigItems["upload_capture"].(bool)
	if !UploadCapture && ok {
		Default = nil
	}
	url, ok := Upload(w.Bytes(), Filename, nil, Default)
	if !ok {
		return
	}
	notifications.ThrowNotification("Fullscreen capture successful.", url)
}

// RunScreenCapture runs a screen capture.
func RunScreenCapture() {
	ShowMagnifier, ok := ConfigItems["magnifier"].(bool)
	if !ok {
		ShowMagnifier = true
	}
	r := regionselector.OpenRegionSelector(true, ShowMagnifier)
	if r == nil {
		return
	}
	w := new(bytes.Buffer)
	err := png.Encode(w, r.Selection)
	if err != nil {
		mainthread.ExecMainThread(func() {
			dialog.Message("%s", err.Error()).Error()
		})
		sentry.CaptureException(err)
		return
	}
	Filename := GenerateFilename() + ".png"
	Default := GetConfiguredUploaders()[0].Uploader
	UploadCapture, ok := ConfigItems["upload_capture"].(bool)
	if !UploadCapture && ok {
		Default = nil
	}
	url, ok := Upload(w.Bytes(), Filename, nil, Default)
	if !ok {
		return
	}
	notifications.ThrowNotification("Screen capture successful.", url)
}

// RunGIFCapture runs a GIF capture.
func RunGIFCapture() {
	ShowMagnifier, ok := ConfigItems["magnifier"].(bool)
	if !ok {
		ShowMagnifier = true
	}
	r := regionselector.OpenRegionSelector(false, ShowMagnifier)
	if r == nil {
		return
	}
	channel := make(chan bool)
	var t *tempicon.TempIcon
	mainthread.ExecMainThread(func() {
		t = tempicon.InitTempIcon(utils.MustBytes(CoreAssets, "stop.png"), func() {
			t.CloseIcon()
			channel <- true
			t = tempicon.InitTempIcon(utils.MustBytes(CoreAssets, "cog.png"), nil, "")
		}, "Stop GIF Capture")
	})
	b := NewGIFCapture(&r.Selection.Rect, channel)
	mainthread.ExecMainThread(t.CloseIcon)
	Filename := GenerateFilename() + ".gif"
	Default := GetConfiguredUploaders()[0].Uploader
	UploadCapture, ok := ConfigItems["upload_capture"].(bool)
	if !UploadCapture && ok {
		Default = nil
	}
	url, ok := Upload(b, Filename, nil, Default)
	if !ok {
		return
	}
	notifications.ThrowNotification("GIF capture successful.", url)
}

// RunClipboardCapture runs a clipboard capture.
func RunClipboardCapture() {
	c := clipboard.GetClipboard()
	FileType := "txt"
	var Data []byte
	if c.Text == nil {
		Data = *c.Data
		f, _ := filetype.Match(Data)
		if f == filetype.Unknown {
			// We do not know the MIME type. RIP.
			mainthread.ExecMainThread(func() {
				dialog.Message("%s", "File type not supported.").Error()
			})
			return
		}
		if f.MIME.Value == "image/tiff" {
			// We should convert this to PNG for compatibility.
			FileType = "png"
			img, err := tiff.Decode(bytes.NewReader(Data))
			if err != nil {
				mainthread.ExecMainThread(func() {
					dialog.Message("%s", err.Error()).Error()
				})
				sentry.CaptureException(err)
				return
			}
			w := new(bytes.Buffer)
			err = png.Encode(w, img)
			if err != nil {
				mainthread.ExecMainThread(func() {
					dialog.Message("%s", err.Error()).Error()
				})
				sentry.CaptureException(err)
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
	UploadCapture, ok := ConfigItems["upload_capture"].(bool)
	if !UploadCapture && ok {
		Default = nil
	}
	Filename := GenerateFilename() + "." + FileType
	url, ok := Upload(Data, Filename, nil, Default)
	if !ok {
		return
	}
	notifications.ThrowNotification("Clipboard capture successful.", url)
}
