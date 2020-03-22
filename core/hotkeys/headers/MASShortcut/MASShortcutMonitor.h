#import "MASShortcut.h"

@interface MASShortcutMonitor : NSObject
- (instancetype) init __unavailable;
+ (instancetype) sharedMonitor;
- (BOOL) registerShortcut: (MASShortcut*) shortcut withAction: (dispatch_block_t) action;
- (BOOL) isShortcutRegistered: (MASShortcut*) shortcut;
- (void) unregisterShortcut: (MASShortcut*) shortcut;
- (void) unregisterAllShortcuts;
@end
