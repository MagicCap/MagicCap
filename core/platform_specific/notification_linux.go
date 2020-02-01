// +build linux
// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2020.

package platformspecific

import (
	"github.com/esiqveland/notify"
	"github.com/godbus/dbus"
	"github.com/pkg/browser"
)

// ThrowNotification is used to throw a notification to the OS.
func ThrowNotification(Text string, URL *string) {
	// Create the session bus.
	b, err := dbus.SessionBus()
	if err != nil {
		panic(err)
	}

	// Create the notifier.
	notifier, err := notify.New(b)
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
	id, err := notifier.SendNotification(n)
	if err != nil {
		panic(err)
	}

	// Listen for invoked action.
	Channel := notifier.ActionInvoked()
	go func() {
		action := <-Channel
		if action.ID == id && URL != nil {
			browser.OpenURL(*URL)
		}
	}()
}
