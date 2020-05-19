package core

import (
	"github.com/getsentry/sentry-go"
	"github.com/jakemakesstuff/ironfist/wrapper"
	"runtime"
	"time"
)

// IronfistEnabled defines if Ironfist is enabled.
var IronfistEnabled = wrapper.IsActive()

// CheckNowFunction is the function used to make the application check for updates now.
var CheckNowFunction = func() {}

func init() {
	EnabledDisabled := "Disabled"
	if IronfistEnabled {
		EnabledDisabled = "Enabled"
	}
	println("Ironfist auto-updater: "+EnabledDisabled)
	if IronfistEnabled {
		// Run a ping packet to ensure Ironfist is behaving properly if this is wrapped.
		err := wrapper.Ping()
		if err != nil {
			sentry.CaptureException(err)
			panic(err)
		}

		// Run initialisation tasks when the database loads.
		PostDatabaseLoadTasks = append(PostDatabaseLoadTasks, func() {
			configured, _ := ConfigItems["ironfist_configured"].(bool)
			if !configured {
				// Join the platform specific default channel.
				err := wrapper.JoinUpdateChannel("default_"+runtime.GOOS)
				if err != nil {
					sentry.CaptureException(err)
					return
				}

				// If beta updates is set, we should join that channel too.
				beta, _ := ConfigItems["beta_channel"].(bool)
				if beta {
					err = wrapper.JoinUpdateChannel("beta_"+runtime.GOOS)
					if err != nil {
						sentry.CaptureException(err)
						return
					}
				}

				// Set configured to true and write to the DB.
				ConfigItems["ironfist_configured"] = true
				UpdateConfig()
			}

			// Start the auto-update loop.
			go autoupdateLoop()
		})
	}
}

func autoupdateLoop() {
	for {
		channel := make(chan bool)
		go func() {
			time.Sleep(time.Minute * 10)
			channel <- true
		}()
		CheckNowFunction = func() {
			channel <- true
		}
		<-channel
		pending, err := wrapper.UpdatePending()
		if err != nil {
			sentry.CaptureException(err)
			continue
		}
		if pending {
			wrapper.HandleUpdate()
		}
	}
}
