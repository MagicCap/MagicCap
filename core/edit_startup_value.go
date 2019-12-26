package core

import (
	"os"

	"github.com/ProtonMail/go-autostart"
)

// EditStartupValue is used to manage edits to the startup value.
func EditStartupValue(Startup bool) {
	app := &autostart.App{
		Name:        "MagicCap",
		DisplayName: "MagicCap",
		Exec:        os.Args,
	}
	if Startup {
		app.Enable()
	} else {
		app.Disable()
	}
}
