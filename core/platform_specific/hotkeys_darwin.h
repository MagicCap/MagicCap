// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

#include "./headers/MASShortcut/Shortcut.h"
#ifndef _HOTKEYS_DARWIN_H
#define _HOTKEYS_DARWIN_H
MASShortcut* LoadHotkey(int Keys, int Modifiers, int CallbackID);
void UnloadHotkey(MASShortcut* shortcut);
#endif
