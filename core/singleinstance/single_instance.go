package singleinstance

import (
	"net"
	"os"
)

// SingleInstance is used to make sure this app is only one instance.
// Gracefully exits and informs the other process if there's another instance running.
func SingleInstance(Lockfile string, SecondInstanceLaunched func()) {
	// Try nudging the other instance if it exists and then exit.
	if _, err := net.Dial("unix", Lockfile); err == nil {
		os.Exit(0)
	}

	// Try listening on the lock file.
	l, err := net.Listen("unix", Lockfile)
	if err != nil {
		// Nuclear time! time to try removing the lock tile.
		if removalErr := os.Remove(Lockfile); removalErr != nil {
			panic(err)
		}
		l, err = net.Listen("unix", Lockfile)
		if err != nil {
			panic(err)
		}
	}
	go func() {
		for {
			if _, err := l.Accept(); err != nil {
				// Ermmmmm, I guess we should give up?
				return
			}
			go SecondInstanceLaunched()
		}
	}()
}
