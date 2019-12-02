package core

import (
	"database/sql"
	"encoding/json"
	"path"
	"sync"
	"time"

	// Needed for SQLite3 support.
	_ "github.com/mattn/go-sqlite3"
)

var (
	// Database defines the database which MagicCap uses.
	Database, _ = sql.Open("sqlite3", path.Join(ConfigPath, "magiccap.db"))

	// DatabaseLock defines the database lock.
	DatabaseLock = sync.Mutex{}

	// ConfigItems defines all the config options which have been set.
	ConfigItems = map[string]interface{}{}

	// ConfigItemsLock is the R/W thread lock for the config.
	ConfigItemsLock = sync.RWMutex{}
)

// Capture defines a capture taken by MagicCap.
type Capture struct {
	Success   bool    `json:"success"`
	Timestamp int     `json:"timestamp"`
	Filename  string  `json:"filename"`
	URL       *string `json:"url"`
	FilePath  *string `json:"file_path"`
}

// GetConfigItems gets all of the config items.
func GetConfigItems() {
	rows, err := Database.Query("SELECT * FROM config")
	if err != nil {
		panic(err)
	}
	ConfigItemsLock.Lock()
	for rows.Next() {
		var Key string
		var Value string
		err = rows.Scan(&Key, &Value)
		if err != nil {
			panic(err)
		}
		var GenericInterface interface{}
		err = json.Unmarshal([]byte(Value), &GenericInterface)
		if err != nil {
			panic(err)
		}
		ConfigItems[Key] = GenericInterface
	}
	ConfigItemsLock.Unlock()
}

// LoadDatabase loads in the database schemas.
func LoadDatabase() {
	// Creates the config table.
	_, err := Database.Exec("CREATE TABLE IF NOT EXISTS `config` (`key` TEXT NOT NULL, `value` TEXT NOT NULL)")
	if err != nil {
		panic(err)
	}

	// Creates the captures table.
	_, err = Database.Exec("CREATE TABLE IF NOT EXISTS `captures` (`filename` TEXT NOT NULL, `success` INTEGER NOT NULL, `timestamp` INTEGER NOT NULL, `url` TEXT, `file_path` TEXT)")
	if err != nil {
		panic(err)
	}
	_, err = Database.Exec("CREATE INDEX IF NOT EXISTS TimestampIndex ON captures(timestamp)")
	if err != nil {
		panic(err)
	}

	// Creates the tokens table.
	_, err = Database.Exec("CREATE TABLE IF NOT EXISTS tokens (token TEXT NOT NULL, expires INTEGER NOT NULL, uploader TEXT NOT NULL)")
	if err != nil {
		panic(err)
	}

	// Gets all of the config items.
	GetConfigItems()

	// Log that the database is initialised.
	println("Database initialised.")
}

// UpdateConfig is used to update the config in the database.
func UpdateConfig() {
	DatabaseLock.Lock()
	_, err := Database.Exec("DELETE FROM config")
	if err != nil {
		panic(err)
	}
	Statement, err := Database.Prepare("INSERT INTO config VALUES (?, ?)")
	if err != nil {
		panic(err)
	}
	ConfigItemsLock.RLock()
	for k, v := range ConfigItems {
		b, err := json.Marshal(&v)
		if err != nil {
			panic(err)
		}
		_, err = Statement.Exec(k, string(b))
		if err != nil {
			panic(err)
		}
	}
	ConfigItemsLock.RUnlock()
	DatabaseLock.Unlock()
	RestartTrayProcess()
	// TODO: Handle hotkeys!
	// TODO Refresh updates!
	// TODO: Handle start on login.
}

// LogUpload logs the upload to the config.
func LogUpload(Filename string, URL *string, FilePath *string, Success bool) {
	DatabaseLock.Lock()
	Statement, err := Database.Prepare("INSERT INTO captures VALUES(?, ?, ?, ?, ?)")
	if err != nil {
		panic(err)
	}
	SuccessInt := 0
	if Success {
		SuccessInt++
	}
	_, err = Statement.Exec(Filename, SuccessInt, time.Now().Unix(), URL, FilePath)
	if err != nil {
		panic(err)
	}
	DatabaseLock.Unlock()
}

// InsertUploads is used to insert uploads.
func InsertUploads(Uploads []map[string]interface{}) {
	DatabaseLock.Lock()
	Statement, err := Database.Prepare("INSERT INTO captures VALUES(?, ?, ?, ?, ?)")
	if err != nil {
		panic(err)
	}
	for _, v := range Uploads {
		SuccessInt := 0
		if v["success"] == true {
			SuccessInt++
		}
		_, err = Statement.Exec(v["filename"], SuccessInt, v["timestamp"], v["url"], v["file_path"])
		if err != nil {
			panic(err)
		}
	}
	DatabaseLock.Unlock()
	timestamp := time.Now().UnixNano() / int64(time.Millisecond)
	Changes = &timestamp
}

// DeleteCapture deletes a capture from the database.
func DeleteCapture(Timestamp int) {
	DatabaseLock.Lock()
	Statement, err := Database.Prepare("DELETE FROM captures WHERE timestamp = ?")
	if err != nil {
		panic(err)
	}
	_, err = Statement.Exec(Timestamp)
	if err != nil {
		panic(err)
	}
	DatabaseLock.Unlock()
}

// PurgeCaptures is used to purge all captures from the database.
func PurgeCaptures() {
	DatabaseLock.Lock()
	Statement, err := Database.Prepare("DELETE FROM captures")
	if err != nil {
		panic(err)
	}
	_, err = Statement.Exec()
	if err != nil {
		panic(err)
	}
	timestamp := time.Now().UnixNano() / int64(time.Millisecond)
	Changes = &timestamp
	DatabaseLock.Unlock()
}

// GetCaptures gets all of the captures from the config.
func GetCaptures() []*Capture {
	arr := make([]*Capture, 0)
	DatabaseLock.Lock()
	Statement, err := Database.Prepare("SELECT * FROM captures ORDER BY timestamp DESC")
	if err != nil {
		panic(err)
	}
	rows, err := Statement.Query()
	if err != nil {
		panic(err)
	}
	for rows.Next() {
		var Filename string
		var SuccessInt int
		var Timestamp int
		var URL *string
		var FilePath *string
		err = rows.Scan(&Filename, &SuccessInt, &Timestamp, &URL, &FilePath)
		if err != nil {
			panic(err)
		}
		arr = append(arr, &Capture{
			Success:   SuccessInt == 1,
			Timestamp: Timestamp,
			Filename:  Filename,
			URL:       URL,
			FilePath:  FilePath,
		})
	}
	DatabaseLock.Unlock()
	return arr
}
