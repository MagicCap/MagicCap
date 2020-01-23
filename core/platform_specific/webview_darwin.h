// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

#ifndef _WEBVIEW_DARWIN_H
#define _WEBVIEW_DARWIN_H
#import <WebKit/WebKit.h>
NSWindow* MakeWebview(char* URL, int URLLen, char* Title, int TitleLen, int Width, int Height, bool Resize);
#endif
