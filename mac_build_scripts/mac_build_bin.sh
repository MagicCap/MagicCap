#!/bin/sh
set -e
cd config/
npm i
npm run build
cd ..
go get
cd assets
go run build_assets.go
cd ..
go build -o magiccap-darwin .
