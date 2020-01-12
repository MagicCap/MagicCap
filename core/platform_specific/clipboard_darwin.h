// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

#ifndef _CLIPBOARD_DARWIN_H
#define _CLIPBOARD_DARWIN_H
void ClipboardHandlerBytes(const uint8_t* data, int64_t len, char* extension);
void ClipboardHandlerText(char* data);
struct ClipboardGet;
struct ClipboardGet* ClipboardHandlerGet();
#endif
