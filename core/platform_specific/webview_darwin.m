// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

#import <WebKit/WebKit.h>

void CWebviewClose(int Listener);

@interface MagicCapWebviewWindowDelegate : NSObject <NSWindowDelegate>
@property int Listener;
@end

@implementation MagicCapWebviewWindowDelegate
- (void)windowWillClose:(NSNotification *)_ {
    CWebviewClose([self Listener]);
    [self release];
};

- (BOOL)canBecomeKeyWindow {
    return YES;
};
@end

@interface MagicCapWebviewDelegate : NSObject <WKUIDelegate>
@end

@implementation MagicCapWebviewDelegate
- (BOOL)acceptsFirstResponder {
    return YES;
};
@end

// Handles making the webview.
NSWindow* MakeWebview(char* URL, int URLLen, char* Title, int TitleLen, int Width, int Height, bool Resize, int Listener) {
    // Ensure the application is configured to ignore other apps.
    [[NSApplication sharedApplication] activateIgnoringOtherApps:YES];

    // Create the view URL from the C bytes.
    NSString* ViewURL = [[NSString alloc] initWithBytes:URL length:URLLen encoding:NSUTF8StringEncoding];

    // Create the URL request with said string.
    NSURL* ParsedURL = [NSURL URLWithString:ViewURL];
    NSURLRequest* request = [NSURLRequest requestWithURL:ParsedURL];

    // Release the view URL string (no longer needed).
    [ViewURL release];

    // Create the frame for the window.
    CGRect frame = CGRectMake(0, 0, Width, Height);

    // Create the actual window.
    int styleMask = NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskMiniaturizable;
    if (Resize) {
        styleMask |= NSResizableWindowMask;
    }
    NSWindow* window = [[NSWindow alloc] initWithContentRect:frame
        styleMask:styleMask backing:NSBackingStoreBuffered defer:NO];
    MagicCapWebviewWindowDelegate* delegate = [[MagicCapWebviewWindowDelegate alloc] init];
    delegate.Listener = Listener;
    window.delegate = delegate;

    // Create the webview widget to go into the window.
    WKWebView* wv = [[WKWebView alloc] initWithFrame:frame];
    MagicCapWebviewDelegate* UIDelegate = [[MagicCapWebviewDelegate alloc] init];
    wv.UIDelegate = UIDelegate;

    // Go to the URL specified.
    [wv loadRequest:request];

    // Release the request.
    [request release];

    // Allow the webview widget to auto resize.
    [wv setAutoresizingMask:NSViewHeightSizable | NSViewWidthSizable];
    [wv setAutoresizesSubviews:YES];

    // Set the content view of the window.
    window.contentView = wv;

    // Set the title.
    NSString* title = [[NSString alloc] initWithBytes:Title length:TitleLen encoding:NSUTF8StringEncoding];
    [window setTitle:title];
    [title release];

    // Center the window.
    [window center]; 

    // Handle the window ordering.
    [window orderFrontRegardless];
    [window makeKeyWindow];

    // Return the webview window.
    return window;
}

// Used to exit the webview.
void ExitWebview(NSWindow* Window) {
    [Window close];
}

// Used to focus the webview.
void FocusWebview(NSWindow* Window) {
    [Window orderFrontRegardless];
}
