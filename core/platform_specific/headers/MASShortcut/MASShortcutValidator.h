#import "MASShortcut.h"

@interface MASShortcutValidator : NSObject

@property(assign) BOOL allowAnyShortcutWithOptionModifier;

+ (instancetype) sharedValidator;

- (BOOL) isShortcutValid: (MASShortcut*) shortcut;
- (BOOL) isShortcut: (MASShortcut*) shortcut alreadyTakenInMenu: (NSMenu*) menu explanation: (NSString**) explanation;
- (BOOL) isShortcutAlreadyTakenBySystem: (MASShortcut*) shortcut explanation: (NSString**) explanation;

@end
