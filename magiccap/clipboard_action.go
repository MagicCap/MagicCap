package magiccap

// ClipboardAction handles the clipboard action.
func ClipboardAction(Data []byte, URL *string) {
	Action := 1
	//Action, ok := ConfigItems["clipboard_action"].(float64)
	//if !ok {
	//	Action = 1
	//}
	switch Action {
	case 0:
		// Do nothing.
		return
	case 1:
		// Copy the file to the clipboard.
		BytesToClipboard(Data)
	case 2:
		// Copy the URL to the clipboard.
		if URL != nil {
			StringToClipboard(*URL)
		}
	}
}
