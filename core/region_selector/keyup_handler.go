package regionselector

import "github.com/go-gl/glfw/v3.3/glfw"

// KeyUpHandler is the key up handler.
func KeyUpHandler(window *glfw.Window, keys []*glfw.Key, CurrentDisplay int, dispatcher *EventDispatcher) {
	// Handles 1 key gestures.
	if len(keys) == 1 {
		switch *keys[0] {
		case glfw.KeyEscape:
			if dispatcher.EscapeHandler != nil {
				dispatcher.EscapeHandler()
				return
			}
			window.SetShouldClose(true)
			return
		case glfw.KeyF:
			window.SetShouldClose(true)
			dispatcher.ShouldFullscreenCapture = true
			return
		default:
			return
		}
	}

	// Handle CmdOrCtrl gestures.
	KeysMinusCmdOrCtrl := make([]*glfw.Key, 0, len(keys))
	CmdOrCtrlKeyHit := false
	for _, v := range keys {
		if *v == glfw.KeyLeftControl || *v == glfw.KeyRightControl || *v == glfw.KeyLeftSuper || *v == glfw.KeyRightSuper {
			CmdOrCtrlKeyHit = true
		} else {
			KeysMinusCmdOrCtrl = append(KeysMinusCmdOrCtrl, v)
		}
	}
	if CmdOrCtrlKeyHit {
		if len(KeysMinusCmdOrCtrl) == 1 && *KeysMinusCmdOrCtrl[0] == glfw.KeyZ {
			// Handle undo.
			if len(dispatcher.History[CurrentDisplay]) >= 1 {
				dispatcher.History[CurrentDisplay] = dispatcher.History[CurrentDisplay][:len(dispatcher.History[CurrentDisplay])-1]
			}
			return
		}
	}
}
