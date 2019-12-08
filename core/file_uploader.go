// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email 2019.

package core

import (
	MagicCapKernelStandards "github.com/magiccap/magiccap-uploaders-kernel/standards"
	"github.com/sqweek/dialog"
	"io/ioutil"
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
	// TODO: Implement native notifications.
}
