package main

//go:generate go run generate_binary_file.go

import (
	"bytes"
	"compress/gzip"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"math/rand"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path"
	"strconv"
	"sync/atomic"
	"syscall"
	"time"
)

// Initialises random.
var random = rand.NewSource(time.Now().UnixNano())

// HomeDir defines the home directory.
var HomeDir, _ = os.UserHomeDir()

// UpdaterPath defines the MagicCap updater folder path.
var UpdaterPath = path.Join(HomeDir, ".magiccap", "updater")

// Decompresses the internally packed binary.
func decompressBinary() []byte {
	r, err := gzip.NewReader(bytes.NewReader(binary()))
	if err != nil {
		panic(err)
	}
	b, err := ioutil.ReadAll(r)
	if err != nil {
		panic(err)
	}
	return b
}

// Defines the PID.
var pid int

// Defines if the application was killed by updater.
var deathByUpdater = make(chan struct{})

// Used to watch the process.
func handleProcessWatching() {
	// Find the process with the os wrapper.
	process, err := os.FindProcess(pid)
	if err != nil {
		panic(err)
	}

	// Make a channel for the process state.
	ProcessStatePtr := make(chan *os.ProcessState)
	go func() {
		p, _ := process.Wait()
		ProcessStatePtr <- p
	}()

	// Create a switch for the channels.
	select {
	case <-deathByUpdater:
		// Ignore this.
		return
	case p := <-ProcessStatePtr:
		// Handle this.
		handleFinalActions()
		os.Exit(p.ExitCode())
		return
	}
}

// Forks the binary.
func forkBinary() {
	if pid != 0 {
		// Kill the current pid.
		deathByUpdater <- struct{}{}
		err := syscall.Kill(pid, syscall.SIGINT)
		if err != nil {
			panic(err)
		}
	}
	currentPath, err := os.Getwd()
	if err != nil {
		panic(err)
	}
	pid, err = syscall.ForkExec(path.Join(UpdaterPath, "binary"), os.Args[1:], &syscall.ProcAttr{
		Env: append(os.Environ(), "UPDATE_SOCK="+sockPath),
		Dir: currentPath,
		Sys: new(syscall.SysProcAttr),
		Files: []uintptr{
			uintptr(syscall.Stdin),
			uintptr(syscall.Stdout),
			uintptr(syscall.Stderr),
		},
	})
	if err != nil {
		panic(err)
	}
	go handleProcessWatching()
}

// Defines the socket used by the application.
var (
	sock     net.Listener
	sockPath string
)

// Defines the packet types.
const (
	PacketPing = uint8(iota)
	PacketUpdateBits
	PacketNewUpdate
)

// UpdateMetadata defines the update metadata JSON.
type UpdateMetadata struct {
	Hash    string `json:"h"`
	Channel uint8  `json:"c"`
}

// Gets/sends the update metadata.
func getUpdateInfo(conn net.Conn, metadata *UpdateMetadata) {
	res, err := http.Get("https://cdn.magiccap.org/updates/" + metadata.Hash + ".json")
	if err == nil {
		// Check if the status code is 200.
		if res.StatusCode == 200 {
			if b, err := ioutil.ReadAll(res.Body); err == nil {
				b = append([]uint8{PacketNewUpdate}, b...)
				_, _ = conn.Write(b)
			}
		}
	}
}

// Processes the update.
func processUpdate(hash string) {
	fmt.Println("[Updater] Processing update hash", hash)
	res, err := http.Get("https://cdn.magiccap.org/updates/binary/" + hash)
	if err == nil {
		if res.StatusCode == 200 {
			binaryFile := path.Join(UpdaterPath, "binary")
			if b, err := ioutil.ReadAll(res.Body); err == nil {
				if err := ioutil.WriteFile(path.Join(UpdaterPath, "current_hash"), []byte(hash), 0666); err == nil {
					if err = ioutil.WriteFile(binaryFile, b, 0766); err == nil {
						fmt.Println("[Updater] Update complete! Rebooting app.")
						forkBinary()
					}
				}
			}
		}
	}
}

// Manages the update connection.
func manageUpdateConnection(conn net.Conn) {
	// Log that the connection is started.
	fmt.Println("[Updater] Updater IPC connection established.")

	// Defines if the connection is active.
	connActive := uintptr(1)

	// Defines the client bits.
	updateBits := uintptr(0)

	// Defines if the update loop is active.
	updateLoopActive := uintptr(0)

	// Defines the client pad.
	clientPad := make([]byte, 1e+6)

	// Handle packets.
	for {
		n, err := conn.Read(clientPad)
		if err != nil {
			atomic.StoreUintptr(&connActive, 0)
			_ = conn.Close()
			return
		}
		if n == 0 {
			continue
		}
		switch clientPad[0] {
		case PacketPing:
			_, _ = conn.Write([]byte{PacketPing})
		case PacketUpdateBits:
			if n == 1 {
				_ = conn.Close()
				return
			}
			atomic.StoreUintptr(&updateBits, uintptr(clientPad[1]))
			if atomic.SwapUintptr(&updateLoopActive, 1) == 0 {
				// Poll for updates.
				go func() {
					// Get the hash string.
					hashPath := path.Join(UpdaterPath, "current_hash")
					b, err := ioutil.ReadFile(hashPath)
					if err != nil {
						panic(err)
					}
					hashString := string(b)

					// Loop whilst the connection is active.
					for atomic.LoadUintptr(&connActive) == 1 {
						// Get the update bits.
						updateBits := uint8(atomic.LoadUintptr(&updateBits))

						// If update bits isn't 0, we'll proceed.
						if updateBits != 0 {
							// Make a request for the hashes.
							res, err := http.Get("https://cdn.magiccap.org/darwin_hashes.json")
							if err == nil {
								// Check if the status code is 200.
								if res.StatusCode == 200 {
									if b, err := ioutil.ReadAll(res.Body); err == nil {
										// Parse the JSON.
										var a []*UpdateMetadata
										if json.Unmarshal(b, &a) == nil {
											// Process the JSON.
											hashHit := false
											var metadata *UpdateMetadata
											for _, v := range a {
												if hashHit && updateBits&v.Channel != 0 {
													metadata = v
												} else if v.Hash == hashString {
													hashHit = true
												}
											}
											if metadata != nil {
												// This is an update after the current one. Try getting the update info.
												getUpdateInfo(conn, metadata)
											}
										}
									}
								}
							}
						}

						// Sleep for 10 minutes.
						time.Sleep(time.Minute * 10)
					}
				}()
			}
			updateBits = uintptr(clientPad[1])
			fmt.Println("[Updater] Update bits set:", updateBits)
		case PacketNewUpdate:
			if n == 1 {
				_ = conn.Close()
				return
			}
			updateHash := clientPad[1:n]
			go processUpdate(string(updateHash))
		}
	}
}

// Manages the applications updates.
func manageUpdates() {
	for {
		conn, err := sock.Accept()
		if err != nil {
			return
		}
		go manageUpdateConnection(conn)
	}
}

// Handle final actions on application exit.
func handleFinalActions() {
	// Destroy the socket.
	_ = sock.Close()
	_ = os.Remove(sockPath)
}

// The main application entrypoint.
func main() {
	// Make the directory if it doesn't exist.
	_ = os.MkdirAll(UpdaterPath, 0777)

	// Make the updater socket.
	sockPath = path.Join(UpdaterPath, strconv.Itoa(int(random.Int63()))+".sock")
	var err error
	sock, err = net.Listen("unix", sockPath)
	if err != nil {
		panic(err)
	}

	// Check the "app_hash" file. If it doesn't exist, this is a new install.
	hashPath := path.Join(UpdaterPath, "app_hash")
	appHash, _ := ioutil.ReadFile(hashPath)
	if string(appHash) != string(hash) {
		fmt.Println("[Updater] App install of different hash detected. Extracting local copy.")
		if err := ioutil.WriteFile(path.Join(UpdaterPath, "binary"), decompressBinary(), 0766); err != nil {
			panic(err)
		}
		if err := ioutil.WriteFile(hashPath, hash, 0666); err != nil {
			panic(err)
		}
		if err := ioutil.WriteFile(path.Join(UpdaterPath, "current_hash"), []byte(base64.StdEncoding.EncodeToString(hash)), 0666); err != nil {
			panic(err)
		}
	}

	// At this point, we have a binary, we should launch both the process and the update functionality in different goroutines.
	go forkBinary()
	go manageUpdates()

	// Handle CTRL+C.
	c := make(chan os.Signal, 2)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c
	err = syscall.Kill(pid, syscall.SIGINT)
	if err != nil {
		panic(err)
	}
	handleFinalActions()
	os.Exit(0)
}
