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
	ClipboardHotkey, _ := ConfigItems["clipboard_hotkey"].(*string)
	if ClipboardHotkey != nil {
		HotkeyIDs = append(HotkeyIDs, platformspecific.LoadHotkey(*ClipboardHotkey, RunClipboardCapture))
	}

	// GIF capture
	GIFHotkey, _ := ConfigItems["gif_hotkey"].(*string)
	if GIFHotkey != nil {
		HotkeyIDs = append(HotkeyIDs, platformspecific.LoadHotkey(*GIFHotkey, RunGIFCapture))
	}

	// Normal capture
	NormalCapHotkey, _ := ConfigItems["hotkey"].(*string)
	if NormalCapHotkey != nil {
		HotkeyIDs = append(HotkeyIDs, platformspecific.LoadHotkey(*NormalCapHotkey, RunScreenCapture))
	}

	// Fullscreen capture
	FullscreenCapHotkey, _ := ConfigItems["fullscreen_hotkey"].(*string)
	if FullscreenCapHotkey != nil {
		HotkeyIDs = append(HotkeyIDs, platformspecific.LoadHotkey(*FullscreenCapHotkey, RunFullscreenCapture))
	}
}

// ManageHotkeysEdit is used to handle hotkey changes.
func ManageHotkeysEdit() {
	// Unload the hotkeys.
	UnloadHotkeys()

	// Load the hotkeys.
	LoadHotkeys()
}
