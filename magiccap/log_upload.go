package magiccap

import "time"

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
