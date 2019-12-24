// +build darwin
// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

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

// clipboardGetC is the C struct.
type clipboardGetC struct {
	text   *C.char
	IsText bool
	data   unsafe.Pointer
	length C.int
}

// GetClipboard is a function used to get what is inside the clipboard.
func GetClipboard() *ClipboardResult {
	// Calls the C function.
	res := (*clipboardGetC)(unsafe.Pointer(C.ClipboardHandlerGet()))

	// Ensures the struct is freed.
	defer func() {
		if res != nil {
			C.free(unsafe.Pointer(res))
		}
	}()

	// Returns the result.
	if res == nil {
		return nil
	} else if (*res).IsText {
		str := C.GoString((*res).text)
		return &ClipboardResult{Text: &str}
	} else {
		data := C.GoBytes((*res).data, (*res).length)
		return &ClipboardResult{Data: &data}
	}
}
