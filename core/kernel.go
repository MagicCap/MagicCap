package core

import (
	"encoding/json"
	"io/ioutil"
	MagicCapKernel "magiccap-uploaders-kernel"
	MagicCapKernelStandards "magiccap-uploaders-kernel/standards"
	"net/http"
	"os"
	"path"
	"strings"
	"time"

	"github.com/sqweek/dialog"
)

var (
	// Kernel defines the initialised uploaders kernel.
	Kernel = MagicCapKernel.Kernel{
		Uploaders: map[string]*MagicCapKernelStandards.Uploader{},
	}

	// UploadersURL defines the URL where the uploaders are at.
	UploadersURL = "https://s3.magiccap.me/kernel/v1.json"
)

// LoadUploadersKernel loads up the kernel.
func LoadUploadersKernel() {
	// Pulls the uploaders kernel.
	PullUploadersKernel := func() *[]byte {
		response, err := http.Get(UploadersURL)
		if err != nil {
			os.Stderr.Write([]byte("Failed to pull the uploaders kernel!\n"))
			return nil
		}
		b, err := ioutil.ReadAll(response.Body)
		if err != nil {
			panic(err)
		}
		err = ioutil.WriteFile(path.Join(ConfigPath, "kernel.json"), b, 0777)
		if err != nil {
			panic(err)
		}
		return &b
	}

	// Gets the uploader kernel.
	if _, err := os.Stat(path.Join(ConfigPath, "kernel.json")); os.IsNotExist(err) {
		// Pull the kernel.
		b := PullUploadersKernel()

		// Load the kernel.
		var Spec map[string]interface{}
		err := json.Unmarshal(*b, &Spec)
		if err != nil {
			panic(err)
		}
		err = Kernel.Load(Spec)
		if err != nil {
			panic(err)
		}
	} else {
		// Loads the kernel.
		b, err := ioutil.ReadFile(path.Join(ConfigPath, "kernel.json"))
		if err != nil {
			panic(err)
		}
		var Spec map[string]interface{}
		err = json.Unmarshal(b, &Spec)
		if err != nil {
			panic(err)
		}
		err = Kernel.Load(Spec)
		if err != nil {
			panic(err)
		}
	}

	// Start a thread to wait 10 mins and pull.
	go func() {
		for true {
			// Sleep for 10 mins.
			time.Sleep(10 * time.Minute)

			// Pull the kernel.
			b := PullUploadersKernel()

			// Load the kernel.
			if b == nil {
				continue
			}
			var Spec map[string]interface{}
			err := json.Unmarshal(*b, &Spec)
			if err != nil {
				panic(err)
			}
			err = Kernel.Load(Spec)
			if err != nil {
				panic(err)
			}
		}
	}()
}

// ConfiguredUploader defines a configured uploader.
type ConfiguredUploader struct {
	Name     string
	Uploader *MagicCapKernelStandards.Uploader
}

// GetConfiguredUploaders gets uploaders which have been configured.
func GetConfiguredUploaders() []ConfiguredUploader {
	// This is what will be returned.
	SupportedUploaders := make([]ConfiguredUploader, 0)

	// Read lock the config items.
	ConfigItemsLock.RLock()

	// Get the default.
	UploaderDefault, ok := ConfigItems["uploader_type"].(string)
	if !ok {
		UploaderDefault = "magiccap"
	}

	// Check all the config items are supported.
	for k, v := range Kernel.Uploaders {
		supported := true
		for _, item := range v.ConfigOptions {
			if _, ok := ConfigItems[item.Value]; !ok {
				supported = false
				break
			}
		}

		Name := v.Name
		if supported {
			if UploaderDefault == k {
				Uploader := ConfiguredUploader{
					Name:     Name + " (Default)",
					Uploader: v,
				}
				SupportedUploaders = append([]ConfiguredUploader{Uploader}, SupportedUploaders...)
			} else {
				SupportedUploaders = append(SupportedUploaders, ConfiguredUploader{
					Name:     Name,
					Uploader: v,
				})
			}
		}
	}

	// Read unlock the config items.
	ConfigItemsLock.RUnlock()

	// Return the supported uploaders.
	return SupportedUploaders
}

// FileExtExpander expands filenames to make sure they are compliant with the macOS clipboard.
func FileExtExpander(ext string) string {
	l := strings.ToLower(ext)
	if l == "jpg" {
		return "jpeg"
	}
	return l
}

// Upload handles all of the MagicCap side stuff.
func Upload(Data []byte, Filename string, FilePath *string, Uploader *MagicCapKernelStandards.Uploader) {
	IsolatedConfig := map[string]interface{}{}
	for _, v := range Uploader.ConfigOptions {
		IsolatedConfig[v.Value] = ConfigItems[v.Value]
	}
	url, err := Uploader.Upload(IsolatedConfig, Data, Filename)
	Changes = true
	if err != nil {
		dialog.Message("%s", err.Error()).Error()
		LogUpload(Filename, nil, FilePath, false)
		return
	}
	LogUpload(Filename, &url, FilePath, true)
	exts := strings.Split(Filename, ".")
	popped := exts[len(exts)-1]
	FullExt := FileExtExpander(popped)
	ClipboardAction(Data, FullExt, &url)
}
