#import <Availability.h>

#if __MAC_OS_X_VERSION_MAX_ALLOWED < 101200
#define NSEventModifierFlagCommand  NSCommandKeyMask
#define NSEventModifierFlagControl  NSControlKeyMask
#define NSEventModifierFlagOption   NSAlternateKeyMask
#define NSEventModifierFlagShift    NSShiftKeyMask
#endif
