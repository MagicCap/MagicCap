// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

package main

import (
	"bytes"
	"fmt"
	"image"
	"image/png"
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/kbinani/screenshot"
	uuid "github.com/satori/go.uuid"
)

func main() {
	n := screenshot.NumActiveDisplays()
	all_displays := make([]image.Rectangle, 0)

	LoadDisplays := func() {
		all_displays = make([]image.Rectangle, 0)
		for i := 0; i < n; i++ {
			all_displays = append(all_displays, screenshot.GetDisplayBounds(i))
		}

		sort.Slice(all_displays, func(a, b int) bool {
			return all_displays[a].Min.X < all_displays[b].Min.X
		})
	}
	LoadDisplays()

	id := fmt.Sprintf("%s", uuid.Must(uuid.NewV4()))

	CaptureHandler := func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		queryValues := r.URL.Query()
		if string(queryValues.Get("key")) != id {
			w.WriteHeader(400)
			w.Write([]byte("Invalid key."))
			return
		}
		display_id, _ := strconv.Atoi(string(queryValues.Get("display")))

		ok := make(chan bool)
		go func() {
			img, err := screenshot.CaptureRect(all_displays[display_id])
			if err != nil {
				panic(err)
			}

			buf := new(bytes.Buffer)
			png.Encode(buf, img)

			w.Header().Set("Content-Type", "image/png")
			w.Write(buf.Bytes())
			ok <- true
		}()
		<-ok
	}

	Reload := func(w http.ResponseWriter, _ *http.Request, _ httprouter.Params) {
		LoadDisplays()
		w.Write([]byte("Reloaded."))
	}

	router := httprouter.New()
	router.GET("/", CaptureHandler)
	router.GET("/reload", Reload)

	fmt.Printf("%s", id)
	log.Fatal(http.ListenAndServe(fmt.Sprintf("127.0.0.1:%s", os.Args[1]), router))
}
