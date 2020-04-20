// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

#ifndef _NOTIFICATION_DARWIN_H
#define _NOTIFICATION_DARWIN_H
void notifications_init();
void throw_notification(char* Text, void* URL);
#endif
