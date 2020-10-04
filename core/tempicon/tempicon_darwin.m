// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

#import <Cocoa/Cocoa.h>

void CTempIconCallbackHandler(int CallbackID);

@interface TempIconWrapper : NSObject
@property int cbid;
@end

@implementation TempIconWrapper
-(void) Run{
    CTempIconCallbackHandler(self.cbid);
}
@end

// Used to initialise the temp icon.
NSStatusItem* InitTempIcon(int HandlerID, uint8_t* Icon, size_t IconLen) {
    // Get the status bar.
    NSStatusBar* StatusBar = [NSStatusBar systemStatusBar];

    // Set the status item.
    NSStatusItem* StatusItem = [[StatusBar statusItemWithLength:NSSquareStatusItemLength] retain];

    // Get the delegate.
    NSObject* delegate = [NSValue valueWithPointer:[[NSApplication sharedApplication] delegate]];

    // Set the target of the status bar to the delegate.
    StatusItem.target = delegate;

    // Set the icon from the PNG specified.
    NSData* ImageData = [NSData dataWithBytes:Icon length:IconLen];
    NSImage* image = [[NSImage alloc] initWithData:ImageData];
    image.size = NSMakeSize(18.0, 18.0);
    StatusItem.image = image;
    [image release];

    // Initialise the tooltip.
    StatusItem.toolTip = @"MagicCap";
    StatusItem.highlightMode = YES;

    // Set the action.
    TempIconWrapper* wrapper = [[TempIconWrapper alloc] init];
    wrapper.cbid = HandlerID;
    StatusItem.button.action = @selector(Run);
    StatusItem.button.target = wrapper;

    // Return the icon.
    return StatusItem;
}

// Used to close the icon.
void CloseIcon(NSStatusItem* item) {
    [[NSStatusBar systemStatusBar] removeStatusItem:item];
}
