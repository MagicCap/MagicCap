// +build darwin

package PlatformSpecific

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Cocoa
#import <Cocoa/Cocoa.h>

void ClipboardHandlerBytes(uint8_t* data, int64_t len, char* extension) {
	NSString* extconv = [NSString stringWithCString:extension encoding:NSUTF8StringEncoding];
	NSString* file = [
		NSString stringWithFormat:@"public.%@",
		extconv
	];
	[
		[NSPasteboard generalPasteboard]
		declareTypes:[NSArray arrayWithObject:file]
		owner:nil
	];
	[
		[NSPasteboard generalPasteboard]
		setData:[NSData dataWithBytesNoCopy:data length:len freeWhenDone:YES]
		forType:file
	];
	[extconv release];
	[file release];
}

void ClipboardHandlerText(char* data) {
    [
    	[NSPasteboard generalPasteboard]
    	declareTypes:[NSArray arrayWithObject:NSStringPboardType]
    	owner:nil
	];
    [
    	[NSPasteboard generalPasteboard]
    	setString:[NSString stringWithCString:data encoding:NSUTF8StringEncoding]
    	forType:NSStringPboardType
	];
}
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
