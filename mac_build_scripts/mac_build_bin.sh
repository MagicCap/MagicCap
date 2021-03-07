#!/bin/sh
set -e
cd config/
npm i
npm run build
cd ..
go generate
GOARCH=amd64 GOOS=darwin CGO_ENABLED=1 go build -o magiccap-darwin-amd64
GOARCH=arm64 GOOS=darwin CGO_ENABLED=1 go build -o magiccap-darwin-arm64
