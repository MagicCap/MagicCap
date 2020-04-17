#!/bin/sh
cd config/
npm i
npm run build
cd ..
go get
CURRENT_CWD=$(pwd)
cd ..
go get github.com/gobuffalo/packr/v2/packr2
cd $CURRENT_CWD
cd assets
go run .
cd ..
~/go/bin/packr2
go build .
~/go/bin/packr2 clean
mv ./MagicCap ./magiccap-darwin
