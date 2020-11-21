// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019-2020.

package core

import (
	"encoding/json"
	coreAssets "github.com/magiccap/MagicCap/assets/core"
	"github.com/magiccap/MagicCap/core/mainthread"
	"io/ioutil"
	"net/http"
	"os"
	"path"
	"strings"
	"time"

	"github.com/getsentry/sentry-go"
	MagicCapKernel "github.com/magiccap/magiccap-uploaders-kernel"
	MagicCapKernelStandards "github.com/magiccap/magiccap-uploaders-kernel/standards"
	"github.com/pkg/browser"

	"github.com/sqweek/dialog"
)

var (
	// Kernel defines the initialised uploaders kernel.
	Kernel = MagicCapKernel.Kernel{
		Uploaders: map[string]*MagicCapKernelStandards.Uploader{},
	}

	// UploadersURL defines the URL where the uploaders are at.
	// TODO: Change this URL!
	UploadersURL = "https://magiccap-s3.sfo2.digitaloceanspaces.com/kernel/v1.json"
)

// LoadUploadersKernel loads up the kernel.
func LoadUploadersKernel() {
	// Pulls the uploaders kernel.
	PullUploadersKernel := func() []byte {
		response, err := http.Get(UploadersURL)
		if err != nil {
			os.Stderr.Write([]byte("Failed to pull the uploaders kernel!\n"))
			return nil
		}
		b, err := ioutil.ReadAll(response.Body)
		if err != nil {
			sentry.CaptureException(err)
			panic(err)
		}
		err = ioutil.WriteFile(path.Join(ConfigPath, "kernel.json"), b, 0666)
		if err != nil {
			sentry.CaptureException(err)
			panic(err)
		}
		return b
	}

	// Gets the uploader kernel.
	if _, err := os.Stat(path.Join(ConfigPath, "kernel.json")); err != nil {
		// Grab the cached copy of the kernel.
		b := coreAssets.Kernel
		err := ioutil.WriteFile(path.Join(ConfigPath, "kernel.json"), b, 0666)
		if err != nil {
			sentry.CaptureException(err)
			panic(err)
		}

		// Load the kernel.
		var Spec map[string]interface{}
		err = json.Unmarshal(b, &Spec)
		if err != nil {
			sentry.CaptureException(err)
			panic(err)
		}
		err = Kernel.Load(Spec)
		if err != nil {
			sentry.CaptureException(err)
			panic(err)
		}
	} else {
		// Loads the kernel.
		b, err := ioutil.ReadFile(path.Join(ConfigPath, "kernel.json"))
		if err != nil {
			sentry.CaptureException(err)
			panic(err)
		}
		var Spec map[string]interface{}
		err = json.Unmarshal(b, &Spec)
		if err != nil {
			sentry.CaptureException(err)
			panic(err)
		}
		err = Kernel.Load(Spec)
		if err != nil {
			sentry.CaptureException(err)
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
			err := json.Unmarshal(b, &Spec)
			if err != nil {
				sentry.CaptureException(err)
				panic(err)
			}
			err = Kernel.Load(Spec)
			if err != nil {
				sentry.CaptureException(err)
				panic(err)
			}
			// RestartTrayProcess(false)
			// TODO: Allow the tray process to be rebooted. The reason this is not possible right now is because it relates to the tray bug.
		}
	}()
}

// ConfiguredUploader defines a configured uploader.
type ConfiguredUploader struct {
	Name     string
	Slug     string
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
		UploaderDefault = "imgur"
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
					Slug:     k,
					Uploader: v,
				}
				SupportedUploaders = append([]ConfiguredUploader{Uploader}, SupportedUploaders...)
			} else {
				SupportedUploaders = append(SupportedUploaders, ConfiguredUploader{
					Name:     Name,
					Slug:     k,
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

func makeSavePath() string {
	SavePath := path.Join(HomeDir, "Pictures", "MagicCap")
	err := os.MkdirAll(SavePath, 0666)
	if err != nil {
		sentry.CaptureException(err)
		panic(err)
	}
	ConfigItems["save_path"] = SavePath
	UpdateConfig()
	return SavePath
}

// Upload handles all of the MagicCap side stuff.
func Upload(Data []byte, Filename string, FilePath *string, Uploader *MagicCapKernelStandards.Uploader) (*string, bool) {
	var url *string
	if FilePath == nil {
		// Handle saving the file if required.
		SaveCapture, ok := ConfigItems["save_capture"].(bool)
		if !ok {
			SaveCapture = true
		}
		if SaveCapture {
			SavePath, ok := ConfigItems["save_path"].(string)
			if !ok {
				SavePath = makeSavePath()
			}
			Joined := path.Join(SavePath, Filename)
			err := ioutil.WriteFile(Joined, Data, 0666)
			if err != nil {
				mainthread.ExecMainThread(func() {
					dialog.Message("%s", err.Error()).Error()
				})
				LogUpload(Filename, nil, nil, false)
				return nil, false
			}
			FilePath = &Joined
		}
	}
	if Uploader != nil {
		// Handle uploading the file.
		IsolatedConfig := map[string]interface{}{}
		for _, v := range Uploader.ConfigOptions {
			IsolatedConfig[v.Value] = ConfigItems[v.Value]
		}
		urlRes, err := Uploader.Upload(IsolatedConfig, Data, Filename)
		timestamp := time.Now().UnixNano() / int64(time.Millisecond)
		Changes = &timestamp
		if err != nil {
			mainthread.ExecMainThread(func() {
				dialog.Message("%s", err.Error()).Error()
			})
			LogUpload(Filename, nil, FilePath, false)
			return nil, false
		}
		url = &urlRes
		UploadOpen, _ := ConfigItems["upload_open"].(bool)
		if UploadOpen {
			_ = browser.OpenURL(urlRes)
		}
	}
	LogUpload(Filename, url, FilePath, true)
	exts := strings.Split(Filename, ".")
	popped := exts[len(exts)-1]
	FullExt := FileExtExpander(popped)
	ClipboardAction(Data, FullExt, url)
	return url, true
}
