// +build darwin

// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

package platformspecific

import (
	gosxnotifier "github.com/deckarep/gosx-notifier"
	"github.com/getsentry/sentry-go"
)

// ThrowNotification is used to throw a notification to the OS.
func ThrowNotification(Text string, URL *string) {
	notif := gosxnotifier.NewNotification(Text)
	notif.Title = "MagicCap"
	notif.Sound = gosxnotifier.Default
	notif.Sender = "org.magiccap.magiccap"
	if URL != nil {
		notif.Link = *URL
	}
	err := notif.Push()
	if err != nil {
		sentry.CaptureException(err)
		panic(err)
	}
}
