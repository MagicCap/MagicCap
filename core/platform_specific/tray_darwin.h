// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

#ifndef _TRAY_DARWIN_H
#define _TRAY_DARWIN_H
#include <stdint.h>
#include <stddef.h>
void InitTray(char** Uploaders, char** Slugs, int UploadersLen, uint8_t* Icon, size_t IconLen);
#endif
