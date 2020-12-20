#!/bin/bash
set -e
mkdir -p ./MagicCap.app/Contents/MacOS
mkdir -p ./MagicCap.app/Contents/Resources
cd macos_updater
go generate
go build -o ../magiccap-darwin-autoupdater
cd ..
cp ./assets/macos/info.plist ./MagicCap.app/Contents/Info.plist
cp ./magiccap-darwin-autoupdater ./MagicCap.app/Contents/MacOS/MagicCap
cp ./assets/macos/icon.icns ./MagicCap.app/Contents/Resources/icon.icns
if [ -n "$SIGNATURE" ]; then
  codesign --sign "$SIGNATURE" ./MagicCap.app/Contents/MacOS/MagicCap
else
  echo "No signature given. Will not sign."
fi
