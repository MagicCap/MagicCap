// +build ignore

package main

import (
	"bytes"
	"compress/gzip"
	"errors"
	"io/ioutil"
	"net/http"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"
)

var (
	underscore = regexp.MustCompile("[a-zA-Z]_[a-zA-Z]")
	dash = regexp.MustCompile("[a-zA-Z]-[a-zA-Z]")
	dot = regexp.MustCompile("[a-zA-Z]\\.[a-zA-Z]")
)

func neatenFilename(name string) string {
	// Pop extension from filename.
	s := strings.Split(name, ".")
	if len(s) != 1 {
		name = strings.Join(s[:len(s)-1], ".")
	}

	// Replace underscores/dashes/dots.
	matches := underscore.FindAllString(name, -1)
	for _, v := range matches {
		s = strings.Split(v, "_")
		name = strings.Replace(name, v, s[0]+strings.ToUpper(s[1]), -1)
	}
	matches = dash.FindAllString(name, -1)
	for _, v := range matches {
		s = strings.Split(v, "-")
		name = strings.Replace(name, v, s[0]+strings.ToUpper(s[1]), -1)
	}
	matches = dot.FindAllString(name, -1)
	for _, v := range matches {
		s = strings.Split(v, ".")
		name = strings.Replace(name, v, s[0]+strings.ToUpper(s[1]), -1)
	}

	// Capitalise the first char.
	if len(name) != 0 {
		x := ""
		for i, c := range name {
			if i == 0 {
				x += string(unicode.ToUpper(c))
			} else {
				x += string(c)
			}
		}
		name = x
	}

	// Return the name.
	return name
}

func main() {
	// Get the kernel file.
	client := http.Client{Timeout: time.Second * 10}
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
	err = ioutil.WriteFile("./core/kernel.json", b, 0666)
	if err != nil {
		panic(err)
	}

	// Go through each folder here and then build the assets.
	var processFolder func(fp string)
	processFolder = func(fp string) {
		generation := map[string][]byte{}
		contents, err := ioutil.ReadDir(fp)
		if err != nil {
			panic(err)
		}
		genMap := false
		for i, file := range contents {
			if file.Name() == ".generate_map" {
				genMap = true
				contents[i] = contents[len(contents)-1]
				contents = contents[:len(contents)-1]
				break
			}
		}
		for _, file := range contents {
			join := filepath.Join(fp, file.Name())
			if file.IsDir() {
				processFolder(join)
			} else {
				if strings.HasSuffix(join, ".go") {
					continue
				}
				b, err := ioutil.ReadFile(join)
				if err != nil {
					panic(err)
				}
				filename := file.Name()
				if !genMap {
					filename = neatenFilename(filename)
				}
				generation[filename] = b
			}
		}
		if len(generation) != 0 {
			// Generate a Go file for all the things.
			_, final := filepath.Split(fp)
			if final == "default" {
				final = "defaultAssets"
			}
			gofile := "package " + final + "\n\n"
			gofile += `import (
	"bytes"
	"compress/gzip"
	"io/ioutil"
)

func decompress(b []byte) []byte {
	buf := bytes.NewReader(b)
	r, err := gzip.NewReader(buf)
	if err != nil {
		panic(err)
	}
	b, err = ioutil.ReadAll(r)
	if err != nil {
		panic(err)
	}
	return b
}

`
			if genMap {
				gofile += "var Data = map[string][]byte{\n"
			}
			for filename, data := range generation {
				buf := bytes.Buffer{}
				w := gzip.NewWriter(&buf)
				_, err = w.Write(data)
				if err != nil {
					panic(err)
				}
				err = w.Flush()
				if err != nil {
					panic(err)
				}
				b := buf.Bytes()
				x := make([]string, len(b))
				for i, v := range b {
					x[i] = strconv.Itoa(int(v))
				}
				if genMap {
					gofile += "\t\"" + filename + "\": decompress([]byte{" + strings.Join(x, ", ") + "}),\n"
				} else {
					gofile += "var " + filename + " = decompress([]byte{" + strings.Join(x, ", ") + "})\n"
				}
			}
			if genMap {
				gofile += "}\n"
			}
			err = ioutil.WriteFile(filepath.Join(fp, "assets_gen.go"), []byte(gofile), 0666)
			if err != nil {
				panic(err)
			}
		}
	}

	// Process the assets folder.
	processFolder(".")

	// Process the config.
	processFolder("../config/src/css")
	processFolder("../config/dist")
}
