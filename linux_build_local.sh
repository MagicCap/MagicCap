#!/bin/sh
set -e
cd config/
npm i
npm run build
cd ..
go generate
go build -o magiccap-linux .
