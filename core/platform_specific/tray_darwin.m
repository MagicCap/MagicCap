// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

#import <Cocoa/Cocoa.h>

void CTrayCallbackHandler(char* callback);

@interface TrayCallbackHandlers : NSObject
@end

@implementation TrayCallbackHandlers
-(void) QuitTrayCallback{
    CTrayCallbackHandler("quit");
}

-(void) PreferencesTrayCallback{
    CTrayCallbackHandler("pref");
}

-(void) FullscreenTrayCallback{
    CTrayCallbackHandler("fullscreen");
}

-(void) ScreenTrayCallback{
    CTrayCallbackHandler("screen");
}

-(void) GIFTrayCallback{
    CTrayCallbackHandler("gif");
}

-(void) ClipboardTrayCallback{
    CTrayCallbackHandler("clipboard");
}

-(void) LinkShortenerTrayCallback{
    CTrayCallbackHandler("short");
}
@end

@interface MagicCapUploaderButtonWrapper : NSObject
@property char* slug;
@end

@implementation MagicCapUploaderButtonWrapper
-(void) Run{
    char* slug = [self slug];
    int len = (int)strlen(slug);
    char* appended = (char*)malloc((len + 6) * sizeof(char));
    appended[0] = 'u';
    appended[1] = 'p';
    appended[2] = 'l';
    appended[3] = 'o';
    appended[4] = 'a';
    appended[5] = 'd';
    for (int i = 0; i < len; i++) {
        appended[6+i] = slug[i];
    }
    CTrayCallbackHandler(appended);
    free(appended);
}
@end

void InitTray(char** Uploaders, char** Slugs, int UploadersLen, uint8_t* Icon, size_t IconLen) {
    // Get the status bar.
    NSStatusBar* StatusBar = [NSStatusBar systemStatusBar];

    // Create the status item.
    NSStatusItem* StatusItem = [[StatusBar statusItemWithLength:NSSquareStatusItemLength] retain];

    // Get the delegate.
    NSObject* delegate = [NSValue valueWithPointer:[[NSApplication sharedApplication] delegate]];

    // Set the target of the status bar to the delegate.
    StatusItem.target = delegate;

    // Defines the handler.
    TrayCallbackHandlers* handlers = [[TrayCallbackHandlers alloc] init];

    // Set the icon from the PNG specified.
    NSData* ImageData = [NSData dataWithBytes:Icon length:IconLen];
    NSImage* image = [[NSImage alloc] initWithData:ImageData];
    image.size = NSMakeSize(18.0, 18.0);
    StatusItem.image = image;
    [image release];

    // Initialise the tooltip.
    StatusItem.toolTip = @"MagicCap";
    StatusItem.highlightMode = YES;

    // Create the menu.
    NSMenu* menu = [[NSMenu alloc] initWithTitle:@"MagicCap"];

    // Create the fullscreen capture button.
    NSMenuItem* FullscreenButton = [[NSMenuItem alloc] initWithTitle:@"Fullscreen Capture" action:@selector(FullscreenTrayCallback) keyEquivalent:@""];
    FullscreenButton.target = handlers;
    [menu addItem:FullscreenButton];
    [FullscreenButton release];

    // Create the screen capture button.
    NSMenuItem* ScreenButton = [[NSMenuItem alloc] initWithTitle:@"Screen Capture" action:@selector(ScreenTrayCallback) keyEquivalent:@""];
    ScreenButton.target = handlers;
    [menu addItem:ScreenButton];
    [ScreenButton release];

    // Create the GIF capture button.
    NSMenuItem* GIFButton = [[NSMenuItem alloc] initWithTitle:@"GIF Capture" action:@selector(GIFTrayCallback) keyEquivalent:@""];
    GIFButton.target = handlers;
    [menu addItem:GIFButton];
    [GIFButton release];

    // Create the clipboard capture button.
    NSMenuItem* ClipboardButton = [[NSMenuItem alloc] initWithTitle:@"Clipboard Capture" action:@selector(ClipboardTrayCallback) keyEquivalent:@""];
    ClipboardButton.target = handlers;
    [menu addItem:ClipboardButton];
    [ClipboardButton release];

    // Create the link shortener button.
    NSMenuItem* LinkShortButton = [[NSMenuItem alloc] initWithTitle:@"Link Shortener" action:@selector(LinkShortenerTrayCallback) keyEquivalent:@""];
    LinkShortButton.target = handlers;
    [menu addItem:LinkShortButton];
    [LinkShortButton release];

    // Handle the "Upload to..." options.
    [menu addItem:[NSMenuItem separatorItem]];
    NSMenuItem* UploadToButton = [[NSMenuItem alloc] init];
    UploadToButton.title = @"Upload to...";
    NSMenu* submenu = [[NSMenu alloc] initWithTitle:@"Upload to..."];
    for (int i = 0; i < UploadersLen; i++) {
        NSString* UploaderNSString = [NSString stringWithUTF8String:Uploaders[i]];
        MagicCapUploaderButtonWrapper* wrapper = [[MagicCapUploaderButtonWrapper alloc] init];
        wrapper.slug = Slugs[i];
        NSMenuItem* UploaderButton = [[NSMenuItem alloc] initWithTitle:[NSString stringWithFormat:@"Upload file to %@", UploaderNSString] action:@selector(Run) keyEquivalent:@""];
        UploaderButton.target = wrapper;
        [submenu addItem:UploaderButton];
        [UploaderButton release];
    }
    UploadToButton.submenu = submenu;
    [menu addItem:UploadToButton];
    [menu addItem:[NSMenuItem separatorItem]];

    // Defines the preferences button.
    NSMenuItem* PrefButton = [[NSMenuItem alloc] initWithTitle:@"Preferences..." action:@selector(PreferencesTrayCallback) keyEquivalent:@""];
    PrefButton.target = handlers;
    [menu addItem:PrefButton];

    // Defines the quit button handler.
    NSMenuItem* QuitButton = [[NSMenuItem alloc] initWithTitle:@"Quit" action:@selector(QuitTrayCallback) keyEquivalent:@""];
    QuitButton.target = handlers;
    [menu addItem:QuitButton];

    // Set the menu to the status item.
    StatusItem.menu = menu;

    // Release everything we can.
    [menu release];
    [UploadToButton release];
    [submenu release];
    [PrefButton release];
    [QuitButton release];
}
