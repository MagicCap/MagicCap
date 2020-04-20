// +build linux
// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

package notifications

import (
	"github.com/esiqveland/notify"
	"github.com/godbus/dbus/v5"
	"github.com/pkg/browser"
)

// NotificationInit handles any initialisation which needs to be done for notifications to work.
func NotificationInit() {
	// Linux requires none.
}

// ThrowNotification is used to throw a notification to the OS.
func ThrowNotification(Text string, URL *string) {
	// Create the session bus.
	b, err := dbus.SessionBus()
	if err != nil {
		panic(err)
	}

	// Create the notifier.
	onAction := func(action *notify.ActionInvokedSignal) {
		if URL != nil {
			browser.OpenURL(*URL)
		}
	}
	notifier, err := notify.New(b, notify.WithOnAction(onAction))
	if err != nil {
		panic(err)
	}

	// Create the notification.
	var Actions []string
	if URL != nil {
		Actions = []string{"open_url", "Open URL"}
	}
	n := notify.Notification{
		AppName: "MagicCap",
		Summary: "MagicCap",
		Actions: Actions,
		Body:    Text,
	}

	// Send the notification.
	_, err = notifier.SendNotification(n)
	if err != nil {
		panic(err)
	}
}
