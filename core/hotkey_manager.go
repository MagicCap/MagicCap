package core

import (
	"github.com/magiccap/MagicCap/core/hotkeys"
)

// UnloadHotkeys is used to unload the hotkeys.
func UnloadHotkeys() {
	hotkeys.UnloadAllHotkeys()
}

// LoadHotkeys is used to load up the hotkeys.
func LoadHotkeys() {
	// Clipboard capture
	ClipboardHotkey, ok := ConfigItems["clipboard_hotkey"].(string)
	if ok {
		hotkeys.LoadHotkey(ClipboardHotkey, RunClipboardCapture)
	}

	// GIF capture
	GIFHotkey, ok := ConfigItems["gif_hotkey"].(string)
	if ok {
		hotkeys.LoadHotkey(GIFHotkey, RunGIFCapture)
	}

	// Normal capture
	NormalCapHotkey, ok := ConfigItems["hotkey"].(string)
	if ok {
		hotkeys.LoadHotkey(NormalCapHotkey, RunScreenCapture)
	}

	// Fullscreen capture
	FullscreenCapHotkey, ok := ConfigItems["fullscreen_hotkey"].(string)
	if ok {
		hotkeys.LoadHotkey(FullscreenCapHotkey, RunFullscreenCapture)
	}
}

// ManageHotkeysEdit is used to handle hotkey changes.
func ManageHotkeysEdit() {
	// Unload the hotkeys.
	UnloadHotkeys()

	// Load the hotkeys.
	LoadHotkeys()
}
