package displaymanagement

import (
	"github.com/magiccap/MagicCap/core/threadsafescreenshot"
	"image"

	"github.com/getsentry/sentry-go"
)

// CaptureAllDisplays is a function used to capture all displays attached in order.
func CaptureAllDisplays(Ordered []image.Rectangle) []*image.RGBA {
	Screenshots := make([]*image.RGBA, len(Ordered))
	for i, v := range Ordered {
		s, err := threadsafescreenshot.CaptureRect(v)
		if err != nil {
			// This is a super core component; this shouldn't fail!
			// If it does, this tool won't work for the user anyway.
			sentry.CaptureException(err)
			panic(err)
		}
		Screenshots[i] = s
	}
	return Screenshots
}
