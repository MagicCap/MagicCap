package main

import (
	"errors"
	"io/ioutil"
	"net/http"
	"strconv"
	"time"
)

func main() {
	client := http.Client{Timeout: time.Second * 5}
	// TODO: Change this URL!
	resp, err := client.Get("https://magiccap-s3.sfo2.digitaloceanspaces.com/kernel/v1.json")
	if err != nil {
		panic(err)
	}
	if resp.StatusCode != 200 {
		panic(errors.New("Returned the status "+strconv.Itoa(resp.StatusCode)))
	}
	b, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		panic(err)
	}
	err = ioutil.WriteFile("./core/kernel.json", b, 0600)
	if err != nil {
		panic(err)
	}
}
