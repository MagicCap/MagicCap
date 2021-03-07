#!/bin/bash
set -e
mkdir -p ./MagicCap.app/Contents/MacOS
mkdir -p ./MagicCap.app/Contents/Resources
cd macos_updater
ARCH=arm64 go generate
GOARCH=arm64 CGO_ENABLED=1 go build -o ../magiccap-darwin-autoupdater-arm64
ARCH=amd64 go generate
GOARCH=amd64 CGO_ENABLED=1 go build -o ../magiccap-darwin-autoupdater-amd64
cd ..
lipo magiccap-darwin-autoupdater-arm64 magiccap-darwin-autoupdater-amd64 -create -output magiccap-darwin-autoupdater
cp ./assets/macos/info.plist ./MagicCap.app/Contents/Info.plist
cp ./magiccap-darwin-autoupdater ./MagicCap.app/Contents/MacOS/MagicCap
cp ./assets/macos/icon.icns ./MagicCap.app/Contents/Resources/icon.icns
if [ -n "$SIGNATURE" ]; then
  codesign --sign "$SIGNATURE" ./MagicCap.app/Contents/MacOS/MagicCap
else
  echo "No signature given. Will not sign."
fi
