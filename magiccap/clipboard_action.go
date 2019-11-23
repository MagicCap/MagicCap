package magiccap

import "MagicCap3/magiccap/platform_specific"

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
		PlatformSpecific.BytesToClipboard(Data, Extension)
	case 2:
		// Copy the URL to the clipboard.
		if URL != nil {
			PlatformSpecific.StringToClipboard(*URL)
		}
	}
}
