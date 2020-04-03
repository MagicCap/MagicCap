// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

#include "./headers/MASShortcut/Shortcut.h"

void CHotkeyCallback(int index);

// Loads the hotkey.
void LoadHotkey(int Keys, int Modifiers, int CallbackID) {
    MASShortcut* shortcut = [MASShortcut shortcutWithKeyCode:Keys modifierFlags:Modifiers];
    [[MASShortcutMonitor sharedMonitor] registerShortcut:shortcut withAction:^(void) {
        CHotkeyCallback(CallbackID);
    }];
}

// Unloads the hotkey.
void UnloadAll() {
    [[MASShortcutMonitor sharedMonitor] unregisterAllShortcuts];
}
