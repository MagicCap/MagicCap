// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

#ifndef _TEMPICON_DARWIN_H
#define _TEMPICON_DARWIN_H
#include <stdint.h>
#include <stddef.h>
#import <Cocoa/Cocoa.h>
NSStatusItem* InitTempIcon(int HandlerID, uint8_t* Icon, size_t IconLen);
void CloseIcon(NSStatusItem* item);
#endif
