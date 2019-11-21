// +build darwin

package magiccap

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Cocoa

#import <Cocoa/Cocoa.h>

void ClipboardHandlerBytes(char* data, int len) {
    [[NSPasteboard generalPasteboard] declareTypes:[NSArray arrayWithObject:NSStringPboardType] owner:nil];
	[[NSPasteboard generalPasteboard] setData:[data:[NSData bytes:&data count:len]] forType:NSFileContentsPboardType];
}

void ClipboardHandlerText(char* data) {
    [[NSPasteboard generalPasteboard] declareTypes:[NSArray arrayWithObject:NSStringPboardType] owner:nil];
    [[NSPasteboard generalPasteboard] setString:[NSString stringWithCString:data encoding:NSASCIIStringEncoding] forType:NSStringPboardType];
}
*/
import "C"
import "unsafe"

// BytesToClipboard is used to place bytes in the clipboard.
func BytesToClipboard(Data []byte) {
	s := string(Data)
	l := len(Data)
	ptr := C.CString(s)
	C.ClipboardHandlerBytes(ptr, C.int(l))
	C.free(unsafe.Pointer(ptr))
}

// StringToClipboard is used to place a string in the clipboard.
func StringToClipboard(Data string) {
	ptr := C.CString(Data)
	C.ClipboardHandlerText(ptr)
	C.free(unsafe.Pointer(ptr))
}
