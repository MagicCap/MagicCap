#!/bin/sh
mkdir -p ./MagicCap.app/Contents/MacOS
cp ./assets/macos/info.plist ./MagicCap.app/Contents/info.plist
cp ./magiccap-darwin ./MagicCap.app/Contents/MacOS/MagicCap
