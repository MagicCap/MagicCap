// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

package core

import (
	"io/ioutil"
	"os"
	"path"
	"strings"

	"github.com/getsentry/sentry-go"
)

// MigrateFrom2 is used to migrate MagicCap 2.X installs to 3.X without the user noticing any breaking changes.
func MigrateFrom2() {
	// Handle ShareX config migration.
	PostDatabaseLoadTasks = append(PostDatabaseLoadTasks, func() {
		SXCUPath, ok := ConfigItems["sharex_sxcu_path"].(string)
		if ok {
			// Migrate this over to the new format.
			if strings.HasPrefix(SXCUPath, "sxcu:") {
				ConfigItems["sxcu_data"] = strings.TrimPrefix(SXCUPath, "sxcu:")
			} else {
				d, err := ioutil.ReadFile(SXCUPath)
				if err == nil {
					ConfigItems["sxcu_data"] = string(d)
				}
			}
			delete(ConfigItems, "sharex_sxcu_path")
			UpdateConfig()
		}
	}, func() {
		defaultUploader, _ := ConfigItems["uploader_type"].(string)
		if defaultUploader == "magiccap" {
			// Make this imgur due to i.magiccap deprecation.
			ConfigItems["uploader_type"] = "imgur"
			UpdateConfig()
		}
	}, func() {
		_, ok := ConfigItems["update_bits"].(float64)
		if !ok {
			// We need to migrate the configuration to support this.
			var bits float64
			defer func() {
				// Deploy the changes.
				ConfigItems["update_bits"] = bits
				UpdateConfig()
			}()
			allowUpdates, ok := ConfigItems["autoupdate_on"].(bool)
			if ok && !allowUpdates {
				// This was switched off. Return.
				return
			}
			bits = 1
			betaUpdates, _ := ConfigItems["beta_channel"].(bool)
			if betaUpdates {
				// Switch the bit for the beta update channel on.
				bits = 3
			}
			ConfigItems["update_bits"] = bits
		}
	})

	// Moves ~/magiccap.db to ~/.magiccap/magiccap.db
	if _, err := os.Stat(path.Join(ConfigPath, "magiccap.db")); os.IsNotExist(err) {
		if _, err := os.Stat(path.Join(HomeDir, "magiccap.db")); os.IsNotExist(err) {
			// This was not a MagicCap 2.X install.
			return
		}
		err = os.Rename(path.Join(HomeDir, "magiccap.db"), path.Join(ConfigPath, "magiccap.db"))
		if err != nil {
			sentry.CaptureException(err)
			panic(err)
		}
	} else {
		// This user is using 3.X already. Return here.
		return
	}

	// TODO: Post beta, we should destroy magiccap-updater and ask about ffmpeg
}
