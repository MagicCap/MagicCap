// +build darwin
// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

// NOTE: Notifications will not work in development unless you build the application with mac_build.sh.
// ---
// Q: Why did this work in Electron?
// A: When you are developing Electron, it is launched with the Electron binary. Since Go builds a binary, it is not here.
// ---
// Q: But gosx-notifier works in a dev environment.
// A: That also pulls in another binary which requires its own permissions.

package notifications

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework UserNotifications -framework Cocoa
#include <stdlib.h>
#include "notification_darwin.h"
*/
import "C"
import "unsafe"

// NotificationInit handles any initialisation which needs to be done for notifications to work.
func NotificationInit() {
	C.notifications_init()
	println("Notifications initialised.")
}

// ThrowNotification is used to throw a notification to the OS.
func ThrowNotification(Text string, URL *string) {
	cstr := C.CString(Text)
	defer C.free(unsafe.Pointer(cstr))
	var curl unsafe.Pointer
	if URL == nil {
		curl = unsafe.Pointer(nil)
	} else {
		urlalloc := C.CString(*URL)
		defer C.free(unsafe.Pointer(urlalloc))
		curl = unsafe.Pointer(urlalloc)
	}
	C.throw_notification(cstr, curl)
}
