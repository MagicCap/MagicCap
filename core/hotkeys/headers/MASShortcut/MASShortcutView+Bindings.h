#import "MASShortcutView.h"

@interface MASShortcutView (Bindings)

@property(copy) NSString *associatedUserDefaultsKey;

- (void) setAssociatedUserDefaultsKey: (NSString*) newKey withTransformer: (NSValueTransformer*) transformer;
- (void) setAssociatedUserDefaultsKey: (NSString*) newKey withTransformerName: (NSString*) transformerName;

@end
