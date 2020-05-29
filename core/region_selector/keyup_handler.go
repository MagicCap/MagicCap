package regionselector

import (
	"github.com/go-gl/glfw/v3.3/glfw"
	"github.com/magiccap/MagicCap/core/region_selector/renderers"
)

// KeyUpHandler is the key up handler.
func KeyUpHandler(renderer renderers.Renderer, keys []int, CurrentDisplay int, dispatcher *EventDispatcher) {
	// Handles 1 key gestures.
	if len(keys) == 1 {
		// TODO: We should probably move away from glfw here.
		switch keys[0] {
		case int(glfw.KeyEscape):
			if dispatcher.EscapeHandler != nil {
				dispatcher.EscapeHandler()
				return
			}
			renderer.ShouldClose()
			return
		case int(glfw.KeyF):
			renderer.ShouldClose()
			dispatcher.ShouldFullscreenCapture = true
			return
		default:
			return
		}
	}

	// Handle CmdOrCtrl gestures.
	KeysMinusCmdOrCtrl := make([]int, 0, len(keys))
	CmdOrCtrlKeyHit := false
	for _, v := range keys {
		if v == int(glfw.KeyLeftControl) || v == int(glfw.KeyRightControl) || v == int(glfw.KeyLeftSuper) || v == int(glfw.KeyRightSuper) {
			CmdOrCtrlKeyHit = true
		} else {
			KeysMinusCmdOrCtrl = append(KeysMinusCmdOrCtrl, v)
		}
	}
	if CmdOrCtrlKeyHit {
		if len(KeysMinusCmdOrCtrl) == 1 && KeysMinusCmdOrCtrl[0] == int(glfw.KeyZ) {
			// Handle undo.
			if len(dispatcher.History[CurrentDisplay]) >= 1 {
				dispatcher.History[CurrentDisplay] = dispatcher.History[CurrentDisplay][:len(dispatcher.History[CurrentDisplay])-1]
			}
			return
		}
	}
}
