// +build linux
// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

package platformspecific

import "github.com/gotk3/gotk3/glib"

// ThrowNotification is used to throw a notification to the OS.
func ThrowNotification(Text string, URL *string) {
	ExecMainThread(func() {
		// Create the notification.
		notif := glib.NotificationNew("MagicCap")
		notif.SetBody(Text)

		// Make a copy of the pointer and its contents.
		//var u *string
		if URL != nil {
			//x := *URL
			//u = &x
		}

		// Setup the notification and run it.
		//notif.SetDefaultAction("app.show-url")
		mainApplication.SendNotification(appID, notif)
		//notif.Unref()
		println("notif")
	})
}
