#!/bin/sh
cd config/
npm i
npm run build
cd ../selector
npm i
npm run build
cd ..
go get .
go get github.com/gobuffalo/packr/packr
~/go/bin/packr build .
mv ./MagicCap ./magiccap-darwin
