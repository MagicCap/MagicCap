// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

#import <Cocoa/Cocoa.h>
#include "notification_darwin.h"

void PushNotification(char* text, void* OnClick) {
    NSUserNotification* notification = [[NSUserNotification alloc] init];
    notification.title = @"MagicCap";
    notification.subtitle = [NSString stringWithUTF8String:text];
    notification.soundName = NSUserNotificationDefaultSoundName;
    [[NSUserNotificationCenter defaultUserNotificationCenter]
            deliverNotification:notification];
}
