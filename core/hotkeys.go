package core

import (
	"sync"

	platformspecific "github.com/magiccap/MagicCap/core/platform_specific"
)

// HotkeyIDs is an array of used hotkeys.
var HotkeyIDs []string

// HotkeyIDsLock is used to thread lock the hotkey ID's.
var HotkeyIDsLock = sync.Mutex{}

// UnloadHotkeys is used to unload the hotkeys.
func UnloadHotkeys() {
	HotkeyIDsLock.Lock()
	for _, v := range HotkeyIDs {
		platformspecific.UnloadHotkey(v)
	}
	HotkeyIDs = make([]string, 0)
	HotkeyIDsLock.Unlock()
}

// LoadHotkeys is used to load up the hotkeys.
func LoadHotkeys() {
	// Clipboard capture
	ClipboardHotkey, ok := ConfigItems["clipboard_hotkey"].(string)
	if ok {
		HotkeyIDs = append(HotkeyIDs, platformspecific.LoadHotkey(ClipboardHotkey, RunClipboardCapture))
	}

	// GIF capture
	GIFHotkey, ok := ConfigItems["gif_hotkey"].(string)
	if ok {
		HotkeyIDs = append(HotkeyIDs, platformspecific.LoadHotkey(GIFHotkey, RunGIFCapture))
	}

	// Normal capture
	NormalCapHotkey, ok := ConfigItems["hotkey"].(string)
	if ok {
		HotkeyIDs = append(HotkeyIDs, platformspecific.LoadHotkey(NormalCapHotkey, RunScreenCapture))
	}

	// Fullscreen capture
	FullscreenCapHotkey, ok := ConfigItems["fullscreen_hotkey"].(string)
	if ok {
		HotkeyIDs = append(HotkeyIDs, platformspecific.LoadHotkey(FullscreenCapHotkey, RunFullscreenCapture))
	}
}

// ManageHotkeysEdit is used to handle hotkey changes.
func ManageHotkeysEdit() {
	// Unload the hotkeys.
	UnloadHotkeys()

	// Load the hotkeys.
	LoadHotkeys()
}
