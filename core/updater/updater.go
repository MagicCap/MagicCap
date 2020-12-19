package updater

import (
	"encoding/json"
	"net"
	"os"
	"time"
)

// UpdateInfo is used to define the update information.
type UpdateInfo struct {
	Hash      string `json:"hash"`
	Name      string `json:"name"`
	Version   string `json:"version"`
	Changelog string `json:"changelog"`
}

// Updater is used to define the structure of the updater.
type Updater struct {
	sockConn net.Conn
}

// Handle the ping packets.
func (u Updater) handlePing() {
	for {
		if _, err := u.sockConn.Write([]byte{0}); err != nil {
			_ = u.sockConn.Close()
			return
		}
		time.Sleep(time.Second)
	}
}

// CurrentUpdater is used to define the current updater.
var CurrentUpdater *Updater

// UpdateFound is the function which is called when an update is found.
var UpdateFound func(*UpdateInfo)

// Handle inbound packets.
func (u Updater) handleInbound() {
	clientPad := make([]byte, 1e+6)
	for {
		n, err := u.sockConn.Read(clientPad)
		if err != nil {
			CurrentUpdater = nil
			createSock()
			return
		}
		b := clientPad[:n]
		if n == 0 {
			continue
		}
		if b[0] == 2 {
			// This is a new update.
			var update UpdateInfo
			if err := json.Unmarshal(b[len(b)-1:], &update); err == nil {
				if UpdateFound != nil {
					go UpdateFound(&update)
				}
			} else {
				println("Failed to decode update.")
			}
		}
	}
}

// SetUpdateBits is used to set the update bits.
func (u Updater) SetUpdateBits(Bits uint8) {
	_, _ = u.sockConn.Write([]byte{1, Bits})
}

// AcceptUpdate is used to tell the update server that the update was accepted.
func (u Updater) AcceptUpdate(Hash string) {
	_, _ = u.sockConn.Write(append([]byte{2}, []byte(Hash)...))
}

// Creates the socket.
func createSock() {
	// Create the socket.
	sock := os.Getenv("UPDATE_SOCK")
	if sock == "" {
		// Not configured to auto-update.
		return
	}
	c, err := net.Dial("unix", sock)
	if err != nil {
		// Hmmmmm, weird.
		println("Failed to bind updater socket: " + err.Error())
		return
	}
	CurrentUpdater = &Updater{sockConn: c}

	// Handle pinging the socket every second to keep it alive.
	go CurrentUpdater.handlePing()

	// Handle inbound packets.
	go CurrentUpdater.handleInbound()
}

// Initialises the updater.
func init() {
	// If the socket exists, we should try and create it on boot.
	createSock()
}
