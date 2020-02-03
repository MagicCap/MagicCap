// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019-2020.

package platformspecific

import (
	"runtime"
	"strings"
	"sync"

	"github.com/google/uuid"
	hook "github.com/robotn/gohook"
)

// UnloadHotkey is used to unload a hotkey ID.
func UnloadHotkey(HotkeyID string) {
	// Ignore blank string.
	if HotkeyID == "" {
		return
	}

	// Read lock the hotkeys.
	hotkeyLock.RLock()

	// Iterate through the hotkeys, finding that index.
	Index := 0
	for i, v := range hotkeys {
		if v.id == HotkeyID {
			Index = i
			break
		}
	}

	// Read unlock the hotkeys.
	hotkeyLock.RUnlock()

	// Remove the item from the array.
	hotkeyLock.Lock()
	hotkeys[Index] = hotkeys[len(hotkeys)-1]
	hotkeys = hotkeys[:len(hotkeys)-1]
	hotkeyLock.Unlock()
}

// LoadHotkey is used to load in a hotkey.
func LoadHotkey(Keys string, Callback func()) string {
	// Ignore blank string.
	if Keys == "" {
		return ""
	}

	// Split by the plus symbol.
	KeysSplit := strings.Split(Keys, "+")

	// Iterate through all of the keys.
	for i, v := range KeysSplit {
		// Make the key lower case.
		v = strings.ToLower(v)

		if v == "plus" {
			// Change this to "+".
			v = "+"
		} else if v == "commandorcontrol" || v == "cmdorctrl" {
			// This is platform dependant - handle this here!
			if runtime.GOOS == "darwin" {
				v = "command"
			} else {
				v = "ctrl"
			}
		} else if v == "control" {
			// Handle shorthanding this.
			v = "ctrl"
		} else if v == "command" {
			// Handle shorthanding this.
			v = "cmd"
		} else if v == "altgr" {
			// Desupported.
			v = "alt"
		} else if v == "return" {
			// Set this to enter.
			v = "enter"
		}

		// Set at the index in the slice.
		KeysSplit[i] = v
	}

	// Generate the ID.
	ID := uuid.Must(uuid.NewUUID()).String()

	// Create the struct.
	h := hotkey{
		id:       ID,
		cb:       Callback,
		keychars: KeysSplit,
	}

	// Handle appending the hotkey.
	hotkeyLock.Lock()
	hotkeys = append(hotkeys, h)
	hotkeyLock.Unlock()

	// Return the hotkey ID.
	return ID
}

// downKeys is all of the down keys.
var downKeys = []uint16{}

// downKeysLock is the thread lock for downKeys.
var downKeysLock = sync.RWMutex{}

// hotkey is used to store a hotkey.
type hotkey struct {
	id       string
	keychars []string
	cb       func()
}

// hotkeys are all configured hotkeys.
var hotkeys = []hotkey{}

// hotkeyLock is the lock for hotkeys.
var hotkeyLock = sync.RWMutex{}

// handleKeyDown is used to handle a key going down.
// TODO: Handle command key
func handleKeyDown(ev hook.Event) {
	// Add the key to the array.
	downKeysLock.Lock()
	downKeys = append(downKeys, ev.Rawcode)
	downKeysLock.Unlock()

	// Create a copy of the down keys array.
	downKeysLock.RLock()
	DownKeysCpy := downKeys
	downKeysLock.RUnlock()

	// Read lock hotkeys.
	hotkeyLock.RLock()

	// Iterate through the hotkeys.
	DownKeycodes := make([]string, len(DownKeysCpy))
	for i, v := range DownKeysCpy {
		Keychar := hook.RawcodetoKeychar(v)
		if Keychar[0] == 0 {
			// Sets the keychar to the English value.
			switch v {
			case 65506, 65505:
				Keychar = "Shift"
				break
			case 65377:
				Keychar = "PrintScreen"
				break
			case 65513, 65027:
				Keychar = "Alt"
				break
			case 65360:
				Keychar = "Home"
				break
			case 65365:
				Keychar = "PageUp"
				break
			case 65366:
				Keychar = "PageDown"
				break
			case 65367:
				Keychar = "End"
				break
			case 65361:
				Keychar = "Left"
				break
			case 65362:
				Keychar = "Up"
				break
			case 65363:
				Keychar = "Right"
				break
			case 65364:
				Keychar = "Down"
				break
			case 65421, 65293:
				Keychar = "Enter"
				break
			case 65379:
				Keychar = "Insert"
				break
			case 65535:
				Keychar = "Delete"
				break
			case 65288:
				Keychar = "Backspace"
				break
			case 65300:
				Keychar = "Scrolllock"
				break
			case 65407:
				Keychar = "Numlock"
				break
			case 65509:
				Keychar = "Capslock"
				break
			case 65289:
				Keychar = "Tab"
				break
			case 65470:
				Keychar = "F1"
				break
			case 65471:
				Keychar = "F2"
				break
			case 65472:
				Keychar = "F3"
				break
			case 65473:
				Keychar = "F4"
				break
			case 65474:
				Keychar = "F5"
				break
			case 65475:
				Keychar = "F6"
				break
			case 65476:
				Keychar = "F7"
				break
			case 65477:
				Keychar = "F8"
				break
			case 65478:
				Keychar = "F9"
				break
			case 65479:
				Keychar = "F10"
				break
			case 65480:
				Keychar = "F11"
				break
			case 65481:
				Keychar = "F12"
				break
			case 65507, 65508:
				Keychar = "Ctrl"
				break
			default:
				// Unknown key!
				println("Unkown key code:", v)
				continue
			}
		}
		DownKeycodes[i] = strings.ToLower(Keychar)
	}
	strarrequnordered := func(a []string, b []string) bool {
		for _, v := range a {
			found := false
			for _, x := range b {
				if x == v {
					found = true
					break
				}
			}
			if !found {
				return false
			}
		}
		return true
	}
	flush := false
	for _, v := range hotkeys {
		if strarrequnordered(v.keychars, DownKeycodes) {
			v.cb()
			flush = true
			break
		}
	}

	// Read unlock hotkeys.
	hotkeyLock.RUnlock()

	// If flush, kill the downKeys array.
	if flush {
		downKeysLock.Lock()
		downKeys = []uint16{}
		downKeysLock.Unlock()
	}
}

// handleKeyUp is used to handle a key going up.
func handleKeyUp(ev hook.Event) {
	// Lock the down keys lock.
	downKeysLock.Lock()

	// Iterate through all keys.
	var KeyIndex *int
	for i, v := range downKeys {
		if v == ev.Rawcode {
			// This is the same key.
			KeyIndex = &i
			break
		}
	}

	// Delete the key index.
	if KeyIndex != nil {
		downKeys[*KeyIndex] = downKeys[len(downKeys)-1]
		downKeys = downKeys[:len(downKeys)-1]
	}

	// Unlock the down keys lock.
	downKeysLock.Unlock()
}

// Initialises the hook loop.
func init() {
	go func() {
		EvChan := hook.Start()
		defer hook.End()
		for ev := range EvChan {
			if ev.Kind == hook.KeyDown {
				go handleKeyDown(ev)
			} else if ev.Kind == hook.KeyUp {
				go handleKeyUp(ev)
			}
		}
	}()
}
