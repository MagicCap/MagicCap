// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

#include <dispatch/dispatch.h>

void CCallbackHandler(int index);

void handle_mainthread(int index) {
    dispatch_async(dispatch_get_main_queue(), ^(void) {
        CCallbackHandler(index);
    });
}
