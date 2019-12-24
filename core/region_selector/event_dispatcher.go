package regionselector

// EventDispatcher is used to dispatch events to the main function.
type EventDispatcher struct {
	ShouldFullscreenCapture bool
	EscapeHandler           func()
	Result                  *SelectorResult
}
