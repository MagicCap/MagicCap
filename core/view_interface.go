package core

import (
	"github.com/pkg/browser"
)

// ViewInterface defines the structure for the view.
type ViewInterface struct{}

// OpenURL opens the url.
func (*ViewInterface) OpenURL(URL string) {
	_ = browser.OpenURL(URL)
}

// ConfigEdit is called when the config is edited.
func (*ViewInterface) ConfigEdit(NewConfig map[string]interface{}) {
	ConfigItemsLock.Lock()
	ConfigItems = NewConfig
	ConfigItemsLock.Unlock()
}

// GetConfig is used to get the config.
func (*ViewInterface) GetConfig() map[string]interface{} {
	return ConfigItems
}

// GetVersion gets the version.
func (*ViewInterface) GetVersion() string {
	return Version
}
