// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

#import <Cocoa/Cocoa.h>

@interface MagicCapNotificationsDelegate : NSObject <NSUserNotificationCenterDelegate>
@end

@implementation MagicCapNotificationsDelegate
- (void) userNotificationCenter:(NSUserNotificationCenter *)_ didActivateNotification:(NSUserNotification *)notification
{
    // If there is a URL field present, we should open.
    if ([notification.userInfo objectForKey:@"k"])
    {
        NSString* str = [notification.userInfo objectForKey:@"k"];
        NSURL* url = [NSURL URLWithString:str];
        [[NSWorkspace sharedWorkspace] openURL:url];
    }

    // We should dismiss the notification.
    [[NSUserNotificationCenter defaultUserNotificationCenter] removeAllDeliveredNotifications];
}

- (BOOL)userNotificationCenter:(NSUserNotificationCenter *)_ shouldPresentNotification:(NSUserNotification *)__
{
    return YES;
}
@end

// Initialises the notifications delegate.
void notifications_init() {
    MagicCapNotificationsDelegate* delegate = (MagicCapNotificationsDelegate *) [MagicCapNotificationsDelegate alloc];
    [[NSUserNotificationCenter defaultUserNotificationCenter] setDelegate:delegate];
}

// Used to throw a notification.
void throw_notification(char* Text, void* URL) {
    NSUserNotification* notification = [[NSUserNotification alloc] init];
    notification.title = @"MagicCap";
    notification.informativeText = @"";
    NSMutableDictionary* dict = [[NSMutableDictionary alloc] init];
    if (URL != nil) {
        [dict setObject:[NSString stringWithCString:URL encoding:NSUTF8StringEncoding] forKey:@"k"];
    }
    notification.userInfo = dict;
    notification.subtitle = [NSString stringWithCString:Text encoding:NSUTF8StringEncoding];
    notification.soundName = NSUserNotificationDefaultSoundName;
    [[NSUserNotificationCenter defaultUserNotificationCenter] removeAllDeliveredNotifications];
    [[NSUserNotificationCenter defaultUserNotificationCenter] deliverNotification:notification];
}
