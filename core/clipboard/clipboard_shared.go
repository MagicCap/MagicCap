// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

package clipboard

// ClipboardResult defines what is in the clipboard.
type ClipboardResult struct {
	Text *string
	Data *[]byte
}
