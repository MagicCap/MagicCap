#import <Cocoa/Cocoa.h>
#include "clipboard_darwin.h"

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
