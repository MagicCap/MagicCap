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

struct ClipboardGet {
    char* text;
    bool IsText;
    uint8_t* data;
    unsigned long* length;
};

struct ClipboardGet* ClipboardHandlerGet() {
    for (NSPasteboardItem *item in [[NSPasteboard generalPasteboard] pasteboardItems]) {
        bool IsText = NO;
        NSString* ActiveType;
        for (NSString *type in [item types]) {
            ActiveType = type;
            if ([type containsString:@"text"]) {
                IsText = YES;
                break;
            } else if ([type containsString:@"tiff"]) {
                break;
            }
        }
        struct ClipboardGet* result = (struct ClipboardGet*)malloc(sizeof(struct ClipboardGet));
        if (IsText == YES) {
            result->IsText = IsText;
            result->data = NULL;
            result->length = 0;
            NSString* data = [[NSPasteboard generalPasteboard] stringForType:NSPasteboardTypeString];
            result->text = [data UTF8String];
        } else {
            NSData* data = [[NSPasteboard generalPasteboard] dataForType:ActiveType];
            result->IsText = IsText;
            result->data = [data bytes];
            unsigned long len = [data length];
            result->length = (int)len;
            result->text = NULL;
        }
        return result;
    }
    return NULL;
}
