// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

package platformspecific

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Cocoa
#include <stdlib.h>
#include "notification_darwin.h"
*/
import "C"
import "unsafe"

// ThrowNotification is used to throw a notification to the OS.
func ThrowNotification(Text string, OnClick func()) {
	C.PushNotification(C.CString(Text), unsafe.Pointer(&OnClick))
}
