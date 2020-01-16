// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

#import <WebKit/WebKit.h>

// Handles making the webview.
WKWebView* MakeWebview(char* URL, int URLLen) {
    CGRect frame = CGRectMake(100, 100, 1000, 1000);
    WKWebView* view = [[WKWebView alloc] initWithFrame:frame];
    NSString* ViewURL = [[NSString alloc] initWithBytes:URL length:URLLen encoding:NSUTF8StringEncoding];
    [
        view
        loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:ViewURL]]
    ];
    [ViewURL release];
    return view;
}
