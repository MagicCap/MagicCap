package core

import (
	"time"

	"github.com/denisbrodbeck/machineid"
	"github.com/jakemakesstuff/structuredhttp"
)

// EnsureInstallID is used to make sure there is a install ID.
func EnsureInstallID() {
	_, ok := ConfigItems["install_id"].(string)
	if !ok {
		// Make a install ID.
		id, err := machineid.ID()
		if err != nil {
			panic(err)
		}
		res, err := structuredhttp.GET("https://api.magiccap.me/install_id/new/" + id).Timeout(time.Second * 10).Run()
		if err != nil {
			panic(err)
		}
		err = res.RaiseForStatus()
		if err != nil {
			panic(err)
		}
		t, err := res.Text()
		if err != nil {
			panic(err)
		}
		ConfigItems["install_id"] = t
		UpdateConfig()
	}
}
