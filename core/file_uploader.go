// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

package core

import (
	"github.com/magiccap/MagicCap/core/mainthread"
	"github.com/magiccap/MagicCap/core/notifications"
	"io/ioutil"
	"path/filepath"

	MagicCapKernelStandards "github.com/magiccap/magiccap-uploaders-kernel/standards"
	"github.com/sqweek/dialog"
)

// OpenFileUploader opens a file uploader.
func OpenFileUploader(Uploader *MagicCapKernelStandards.Uploader) {
	fp, err := dialog.File().Title("Select the file to upload.").Load()
	if err != nil {
		return
	}
	b, err := ioutil.ReadFile(fp)
	if err != nil {
		mainthread.ExecMainThread(func() {
			dialog.Message("%s", err.Error()).Error()
		})
		return
	}
	url, ok := Upload(b, filepath.Base(fp), &fp, Uploader)
	if !ok {
		return
	}
	notifications.ThrowNotification("File upload successful.", url)
}
