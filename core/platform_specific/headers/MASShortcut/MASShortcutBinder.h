#import "MASShortcutMonitor.h"

@interface MASShortcutBinder : NSObject
+ (instancetype) sharedBinder;
@property(strong) MASShortcutMonitor *shortcutMonitor;
@property(copy) NSDictionary *bindingOptions;
- (void) bindShortcutWithDefaultsKey: (NSString*) defaultsKeyName toAction: (dispatch_block_t) action;
- (void) breakBindingWithDefaultsKey: (NSString*) defaultsKeyName;
- (void) registerDefaultShortcuts: (NSDictionary*) defaultShortcuts;
@end
