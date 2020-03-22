package core

import (
	"github.com/magiccap/MagicCap/core/hotkeys"
	"sync"
)

// HotkeyIDs is an array of used hotkeys.
var HotkeyIDs []string

// HotkeyIDsLock is used to thread lock the hotkey ID's.
var HotkeyIDsLock = sync.Mutex{}

// UnloadHotkeys is used to unload the hotkeys.
func UnloadHotkeys() {
	HotkeyIDsLock.Lock()
	for _, v := range HotkeyIDs {
		hotkeys.UnloadHotkey(v)
	}
	HotkeyIDs = make([]string, 0)
	HotkeyIDsLock.Unlock()
}

// LoadHotkeys is used to load up the hotkeys.
func LoadHotkeys() {
	// Clipboard capture
	ClipboardHotkey, ok := ConfigItems["clipboard_hotkey"].(string)
	if ok {
		HotkeyIDs = append(HotkeyIDs, hotkeys.LoadHotkey(ClipboardHotkey, RunClipboardCapture))
	}

	// GIF capture
	GIFHotkey, ok := ConfigItems["gif_hotkey"].(string)
	if ok {
		HotkeyIDs = append(HotkeyIDs, hotkeys.LoadHotkey(GIFHotkey, RunGIFCapture))
	}

	// Normal capture
	NormalCapHotkey, ok := ConfigItems["hotkey"].(string)
	if ok {
		HotkeyIDs = append(HotkeyIDs, hotkeys.LoadHotkey(NormalCapHotkey, RunScreenCapture))
	}

	// Fullscreen capture
	FullscreenCapHotkey, ok := ConfigItems["fullscreen_hotkey"].(string)
	if ok {
		HotkeyIDs = append(HotkeyIDs, hotkeys.LoadHotkey(FullscreenCapHotkey, RunFullscreenCapture))
	}
}

// ManageHotkeysEdit is used to handle hotkey changes.
func ManageHotkeysEdit() {
	// Unload the hotkeys.
	UnloadHotkeys()

	// Load the hotkeys.
	LoadHotkeys()
}
