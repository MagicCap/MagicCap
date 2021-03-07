// +build ignore

package main

import (
	"bytes"
	"crypto/sha512"
	"encoding/base64"
	"encoding/json"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"io/ioutil"
	"os"
	"strings"
)

// Expect a variable or panic.
func envMust(name string) string {
	x := os.Getenv(name)
	if x == "" {
		panic(name + " unset")
	}
	return x
}

// Uploads a binary to the CDN. Returns the hash.
func uploadBinary(path, bucket, version, changelogs string, svc *s3.S3) string {
	// Get the magiccap-darwin binary.
	binary, err := ioutil.ReadFile(path)
	if err != nil {
		panic(err)
	}

	// Calculate the hash.
	hash := sha512.New()
	hash.Write(binary)
	sum := base64.StdEncoding.EncodeToString(hash.Sum(nil))

	// Store the binary.
	l := int64(len(binary))
	Key := "updates/binary/" + sum
	MimeType := "application/octet-stream"
	if _, err := svc.PutObject(&s3.PutObjectInput{
		Bucket:             &bucket,
		Key:                &Key,
		ContentType:        &MimeType,
		Body:               bytes.NewReader(binary),
		ACL:                aws.String("public-read"),
		ContentLength:      &l,
		ContentDisposition: aws.String("attachment"),
	}); err != nil {
		panic(err)
	}

	// Store the information about the update.
	MimeType = "application/json"
	updateInfo := map[string]string{
		"hash":      sum,
		"name":      "MagicCap",
		"version":   version,
		"changelog": changelogs,
	}
	b, err := json.Marshal(updateInfo)
	if err != nil {
		panic(err)
	}
	l = int64(len(b))
	Key = "updates/" + sum + ".json"
	if _, err := svc.PutObject(&s3.PutObjectInput{
		Bucket:             &bucket,
		Key:                &Key,
		ContentType:        &MimeType,
		Body:               bytes.NewReader(b),
		ACL:                aws.String("public-read"),
		ContentLength:      &l,
		ContentDisposition: aws.String("attachment"),
	}); err != nil {
		panic(err)
	}

	// Return the hash.
	return sum
}

// Updates the hashes file.
func updateHashesFile(key, sum, bucket, version string, svc *s3.S3) {
	// Get the hashes.
	result, err := svc.GetObject(&s3.GetObjectInput{
		Bucket: &bucket,
		Key:    &key,
	})
	var metadatas []*UpdateMetadata
	if err == nil {
		// Read the body.
		b, err := ioutil.ReadAll(result.Body)
		if err != nil {
			panic(err)
		}

		// Decode the JSON.
		if err := json.Unmarshal(b, &metadatas); err != nil {
			panic(err)
		}
	} else {
		// Make the array.
		metadatas = []*UpdateMetadata{}
	}

	// Get the update channel.
	var channel uint8
	if strings.Contains(version, "b") {
		// | Alpha (4) | Beta (2) | Stable (1) |
		// |     0     |    1     |      0     |
		channel = 2
	} else if strings.Contains(version, "a") {
		// | Alpha (4) | Beta (2) | Stable (1) |
		// |     1     |    0     |      0     |
		channel = 4
	} else {
		// | Alpha (4) | Beta (2) | Stable (1) |
		// |     0     |    0     |      1     |
		channel = 1
	}

	// Add to the update metadata.
	metadatas = append(metadatas, &UpdateMetadata{
		Hash:    sum,
		Channel: channel,
	})
	b, err := json.Marshal(metadatas)
	if err != nil {
		panic(err)
	}
	l := int64(len(b))
	mime := "application/json"
	if _, err := svc.PutObject(&s3.PutObjectInput{
		Bucket:             &bucket,
		Key:                &key,
		ContentType:        &mime,
		Body:               bytes.NewReader(b),
		ACL:                aws.String("public-read"),
		ContentLength:      &l,
		ContentDisposition: aws.String("attachment"),
	}); err != nil {
		panic(err)
	}
}

// UpdateMetadata defines the update metadata JSON.
type UpdateMetadata struct {
	Hash    string `json:"h"`
	Channel uint8  `json:"c"`
}

func main() {
	// Get the variables.
	Version := envMust("VERSION")
	Changelogs := envMust("CHANGELOGS")
	SecretAccessKey := envMust("AWS_SECRET_ACCESS_KEY")
	Bucket := envMust("S3_BUCKET")
	AccessKeyID := envMust("AWS_ACCESS_KEY_ID")
	Region := envMust("S3_REGION")
	Endpoint := envMust("S3_ENDPOINT")

	// Create the S3 session.
	StaticCredential := credentials.NewStaticCredentials(AccessKeyID, SecretAccessKey, "")
	s3sess := session.Must(session.NewSession(&aws.Config{
		Endpoint:    &Endpoint,
		Credentials: StaticCredential,
		Region:      &Region,
	}))
	svc := s3.New(s3sess)

	// Uploads the magiccap-darwin-amd64 binary and changelogs.
	sum := uploadBinary("./magiccap-darwin-amd64", Bucket, Version, Changelogs, svc)

	// Update the amd64 hashes json.
	updateHashesFile("darwin_amd64_hashes.json", sum, Bucket, Version, svc)

	// Uploads the magiccap-darwin-arm64 binary and changelogs.
	sum = uploadBinary("./magiccap-darwin-arm64", Bucket, Version, Changelogs, svc)

	// Update the arm64 hashes json.
	updateHashesFile("darwin_arm64_hashes.json", sum, Bucket, Version, svc)
}
