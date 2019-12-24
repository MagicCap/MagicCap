// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

package core

import (
	"math/rand"
	"strings"
	"time"
)

// GenerateFilename is used to generate a new filename.
func GenerateFilename() string {
	// Gets the file naming pattern.
	Filename, ok := ConfigItems["file_naming_pattern"].(string)
	if !ok {
		Filename = "screenshot_%date%_%time%"
	}

	// Handles random chars.
	chars := "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
	FilenameByteArr := []byte(Filename)
	EditMade := false
	for {
		for i, v := range FilenameByteArr {
			if v == 34 {
				// Quote mark.
				FilenameByteArr[i] = chars[rand.Intn(len(chars))]
				EditMade = true
			}
		}
		if !EditMade {
			// No edits made.
			break
		}
	}
	Filename = string(FilenameByteArr)

	// Handles random emojis.
	Contains := strings.Contains(Filename, "%emoji%")
	for Contains {
		Filename = strings.Replace(Filename, "%emoji%", Emojis[rand.Intn(len(Emojis))], 1)
		Contains = strings.Contains(Filename, "%emoji%")
	}

	// Handles date/time.
	now := time.Now()
	Filename = strings.ReplaceAll(strings.ReplaceAll(
		Filename, "%date%", now.Format("02-01-2006")),
		"%time%", now.Format("15-04-05"))

	// Returns the filename.
	return Filename
}
