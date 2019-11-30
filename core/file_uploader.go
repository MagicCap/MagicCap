package core

import (
	"github.com/sqweek/dialog"
	"io/ioutil"
	MagicCapKernelStandards "magiccap-uploaders-kernel/standards"
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
