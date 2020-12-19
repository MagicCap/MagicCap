package core

import (
	"github.com/magiccap/MagicCap/core/mainthread"
	"github.com/magiccap/MagicCap/core/updater"
	"github.com/sqweek/dialog"
	"sync"
)

var notificationMu = sync.Mutex{}

// HandleUpdateNotification is used to handle update notificiations.
func HandleUpdateNotification(updateInfo *updater.UpdateInfo) {
	notificationMu.Lock()
	a, ok := ConfigItems["ignored_updates"].([]interface{})
	for _, v := range a {
		if v == updateInfo.Hash {
			return
		}
	}
	var update bool
	mainthread.ExecMainThread(func() {
		update = dialog.Message(
			"%s %s is now avaliable:\n\n%s\n\nDo you wish to upgrade to this release?", updateInfo.Name, updateInfo.Version, updateInfo.Changelog).Title("New update avaliable").YesNo()
	})
	if update {
		if updater.CurrentUpdater != nil {
			updater.CurrentUpdater.AcceptUpdate(updateInfo.Hash)
		}
	} else if ok {
		ConfigItems["ignored_updates"] = append(a, updateInfo.Hash)
		UpdateConfig()
	} else {
		ConfigItems["ignored_updates"] = []interface{}{updateInfo.Hash}
		UpdateConfig()
	}
	notificationMu.Unlock()
}
