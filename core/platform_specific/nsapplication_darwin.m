// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

#import <Cocoa/Cocoa.h>

void CReadyCallback();

@interface MagicCapDelegate : NSObject <NSApplicationDelegate>
@end

@implementation MagicCapDelegate
- (void)applicationDidFinishLaunching:(NSNotification *)_ {
    CReadyCallback();
};
@end

void DelegateInit() {
    MagicCapDelegate* delegate = (MagicCapDelegate *) [[MagicCapDelegate alloc] init];
    NSApplication* application = [NSApplication sharedApplication];
    [application setDelegate:delegate];
    [NSApp run];
    [delegate release];
}
