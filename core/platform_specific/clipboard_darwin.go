// +build darwin

package platformspecific

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Cocoa
#include <stdlib.h>
#include "clipboard_darwin.h"
*/
import "C"
import "unsafe"

// BytesToClipboard is used to place bytes in the clipboard.
func BytesToClipboard(Data []byte, Extension string) {
	ptr := C.CString(Extension)
	C.ClipboardHandlerBytes((*C.uint8_t)(unsafe.Pointer(&Data[0])), C.longlong(int64(len(Data))), ptr)
	C.free(unsafe.Pointer(ptr))
}

// StringToClipboard is used to place a string in the clipboard.
func StringToClipboard(Data string) {
	ptr := C.CString(Data)
	C.ClipboardHandlerText(ptr)
	C.free(unsafe.Pointer(ptr))
}
