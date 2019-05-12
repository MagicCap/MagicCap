// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

package main

import (
	"github.com/kbinani/screenshot"
	"github.com/satori/go.uuid"
	"image/png"
	"image"
	"strconv"
	"bytes"
	"sort"
	"net/http"
	"fmt"
	"os"
)

func main() {
	n := screenshot.NumActiveDisplays()
	all_displays := make([]image.Rectangle, 0)

	for i := 0; i < n; i++ {
		all_displays = append(all_displays, screenshot.GetDisplayBounds(i))
	}

	sort.Slice(all_displays, func(a, b int) bool {
		return all_displays[a].Min.X < all_displays[b].Min.X
	})

	id := fmt.Sprintf("%s", uuid.Must(uuid.NewV4()))

	http.HandleFunc("/", func (w http.ResponseWriter, r *http.Request) {
		queryValues := r.URL.Query()
		key := queryValues.Get("key")
		if key != id {
			panic("Invalid key.")
		}
		display_id, _ := strconv.Atoi(queryValues.Get("display"))

		img, err := screenshot.CaptureRect(all_displays[display_id])
		if err != nil {
			panic(err)
		}
	
		buf := new(bytes.Buffer)
		png.Encode(buf, img)
		
		w.Write(buf.Bytes())
	})

	fmt.Printf("%s", id)
	http.ListenAndServe(fmt.Sprintf("127.0.0.1:%s", os.Args[1]), nil)
}
