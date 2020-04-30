// +build darwin
// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.
// TODO: After a shortcut refresh, shortcuts break, I assume that's here.

package hotkeys

import (
	"github.com/MagicCap/MASShortcut"
	"strings"
)

var globalMonitor = masshortcut.GetGlobalShortcutMonitor()

// KeyMaps is used to map a key to the int value.
var KeyMaps = map[string]int{
	"plus":      0x15,
	"0":         0x1F,
	"1":         0x12,
	"2":         0x13,
	"3":         0x14,
	"4":         0x15,
	"5":         0x17,
	"6":         0x16,
	"7":         0x1A,
	"8":         0x1C,
	"9":         0x19,
	"a":         0x00,
	"b":         0x0B,
	"c":         0x08,
	"d":         0x02,
	"e":         0x0E,
	"f":         0x03,
	"g":         0x05,
	"h":         0x04,
	"i":         0x22,
	"j":         0x26,
	"k":         0x28,
	"m":         0x2E,
	"n":         0x2D,
	"o":         0x1F,
	"p":         0x23,
	"q":         0x0C,
	"r":         0x0F,
	"s":         0x01,
	"t":         0x11,
	"u":         0x20,
	"v":         0x09,
	"w":         0x0D,
	"x":         0x07,
	"y":         0x10,
	"z":         0x06,
	"return":    0x24,
	"enter":     0x24,
	"f1":        0x7A,
	"f2":        0x78,
	"f3":        0x63,
	"f4":        0x76,
	"f5":        0x60,
	"f6":        0x61,
	"f7":        0x62,
	"f8":        0x64,
	"f9":        0x65,
	"f10":       0x6D,
	"f11":       0x67,
	"f12":       0x6F,
	"f13":       0x69,
	"f14":       0x6B,
	"f15":       0x71,
	"f16":       0x6A,
	"f17":       0x40,
	"f18":       0x4F,
	"f19":       0x50,
	"f20":       0x5A,
	"space":     0x31,
	"tab":       0x30,
	"capslock":  0x39,
	"backspace": 0x33,
	"delete":    0x33,
	"up":        0x7E,
	"down":      0x7D,
	"left":      0x7B,
	"right":     0x7C,
	"home":      0x73,
	"end":       0x77,
	"pageup":    0x74,
	"pagedown":  0x79,
	"escape":    0x35,
	"esc":       0x35,
}

// UnloadAllHotkeys is used to unload all hotkeys.
func UnloadAllHotkeys() {
	globalMonitor.UnregisterShortcuts()
}

// LoadHotkey is used to load in a hotkey.
func LoadHotkey(Keys string, Callback func()) {
	// Ignore blank string.
	if Keys == "" {
		return
	}

	// Defines the keys and modifiers.
	KeysInt := 0
	ModifiersInt := 0

	// Split by the plus symbol.
	KeysSplit := strings.Split(Keys, "+")

	// Iterate through all of the keys.
	for _, v := range KeysSplit {
		// Make the key lower case.
		v = strings.ToLower(v)

		if v == "commandorcontrol" || v == "cmdorctrl" {
			ModifiersInt |= 1 << 20
		} else if v == "control" || v == "ctrl" {
			ModifiersInt |= 1 << 18
		} else if v == "command" || v == "cmd" {
			ModifiersInt |= 1 << 20
		} else if v == "altgr" || v == "alt" {
			ModifiersInt |= 1 << 19
		} else if v == "option" {
			ModifiersInt |= 1 << 19
		} else if v == "shift" {
			ModifiersInt |= 1 << 17
		} else {
			key, ok := KeyMaps[v]
			if !ok {
				return
			}
			KeysInt |= key
		}
	}

	// Call the MASShortcut function.
	globalMonitor.RegisterShortcut(KeysInt, ModifiersInt, Callback)
}
