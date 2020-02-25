#import "MASKeyCodes.h"
@interface MASShortcut : NSObject <NSSecureCoding, NSCopying>
@property (nonatomic, readonly) NSInteger keyCode;
@property (nonatomic, readonly) NSEventModifierFlags modifierFlags;
@property (nonatomic, readonly) UInt32 carbonKeyCode;
@property (nonatomic, readonly) UInt32 carbonFlags;
@property (nonatomic, readonly) NSString *keyCodeString;
@property (nonatomic, readonly) NSString *keyCodeStringForKeyEquivalent;
@property (nonatomic, readonly) NSString *modifierFlagsString;
- (instancetype)initWithKeyCode:(NSInteger)code modifierFlags:(NSEventModifierFlags)flags;
+ (instancetype)shortcutWithKeyCode:(NSInteger)code modifierFlags:(NSEventModifierFlags)flags;
+ (instancetype)shortcutWithEvent:(NSEvent *)anEvent;
@end
