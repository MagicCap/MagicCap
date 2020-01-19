// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

#import <WebKit/WebKit.h>

// Handles making the webview.
WKWebView* MakeWebview(char* URL, int URLLen, char* Title, int TitleLen, int Width, int Height) {
    NSString* ViewURL = [[NSString alloc] initWithBytes:URL length:URLLen encoding:NSUTF8StringEncoding];
    NSURLRequest *request = [NSURLRequest requestWithURL:[NSURL URLWithString:ViewURL]];
    [ViewURL release];
    CGRect frame = CGRectMake(0, 0, 1000, 1000);
    NSWindow* window = [[[NSWindow alloc] initWithContentRect:frame
        styleMask:NSResizableWindowMask | NSClosableWindowMask
        | NSTitledWindowMask | NSTexturedBackgroundWindowMask | NSFullSizeContentViewWindowMask backing:NSBackingStoreBuffered defer:NO]
            autorelease];
    WKWebView* wv = [[WKWebView alloc] initWithFrame:window.frame];
    [wv loadRequest:request];
    [window.contentView addSubview:wv];
    [window cascadeTopLeftFromPoint:NSMakePoint(20,20)];
    NSString* title = [[NSString alloc] initWithBytes:Title length:TitleLen encoding:NSUTF8StringEncoding];
    [window setTitle:title];
    [title release];
    [window makeKeyAndOrderFront:[NSValue valueWithPointer:[[NSApplication sharedApplication] delegate]]];
    return wv;
}
