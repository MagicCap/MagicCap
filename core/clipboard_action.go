package core

import "github.com/MagicCap/MagicCap/core/platform_specific"

// ClipboardAction handles the clipboard action.
func ClipboardAction(Data []byte, Extension string, URL *string) {
	Action, ok := ConfigItems["clipboard_action"].(float64)
	if !ok {
		Action = 1
	}
	switch Action {
	case 0:
		// Do nothing.
		return
	case 1:
		// Copy the file to the clipboard.
		platformspecific.BytesToClipboard(Data, Extension)
	case 2:
		// Copy the URL to the clipboard.
		if URL != nil {
			platformspecific.StringToClipboard(*URL)
		}
	}
}
