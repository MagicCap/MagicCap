// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

package core

import (
	"os"
	"path"
)

// MigrateFrom2 is used to migrate MagicCap 2.X installs to 3.X without the user noticing any breaking changes.
func MigrateFrom2() {
	// Moves ~/magiccap.db to ~/.magiccap/magiccap.db
	if _, err := os.Stat(path.Join(ConfigPath, "magiccap.db")); os.IsNotExist(err) {
		if _, err := os.Stat(path.Join(HomeDir, "magiccap.db")); os.IsNotExist(err) {
			// This was not a MagicCap 2.X install.
			return
		}
		err = os.Rename(path.Join(HomeDir, "magiccap.db"), path.Join(ConfigPath, "magiccap.db"))
		if err != nil {
			panic(err)
		}
	} else {
		// This user is using 3.X already. Return here.
		return
	}
}
