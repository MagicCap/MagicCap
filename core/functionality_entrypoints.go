package core

import (
	"bytes"
	"github.com/MagicCap/MagicCap/core/platform_specific"
	"github.com/h2non/filetype"
	"github.com/sqweek/dialog"
	"golang.org/x/image/tiff"
	"image/png"
)

// ShowShort shows the shortener screen.
func ShowShort() {
	// TODO: Implement this!
	println("ShowShort")
}

// RunScreenCapture runs a screen capture.
func RunScreenCapture() {
	// TODO: Implement this!
	println("RunScreenCapture")
}

// RunGIFCapture runs a GIF capture.
func RunGIFCapture() {
	// TODO: Implement this!
	println("RunGIFCapture")
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
