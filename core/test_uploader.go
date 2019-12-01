package core

import (
	"github.com/jakemakesstuff/structuredhttp"
	"time"
)

// TestUploader is a function which is used to test uploaders.
func TestUploader(UploaderName string) error {
	// Upload the file.
	Uploader := Kernel.Uploaders[UploaderName]
	IsolatedConfig := map[string]interface{}{}
	for _, v := range Uploader.ConfigOptions {
		IsolatedConfig[v.Value] = ConfigItems[v.Value]
	}
	url, err := Uploader.Upload(IsolatedConfig, Assets.Bytes("taskbar@2x.png"), "test.png")
	if err != nil {
		return err
	}

	// Test the URL.
	res, err := structuredhttp.GET(url).Timeout(30 * time.Second).Run()
	if err != nil {
		return err
	}
	err = res.RaiseForStatus()
	if err != nil {
		return err
	}

	// Everything is fine; return null.
	return nil
}
