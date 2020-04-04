#!/bin/sh
mkdir -p ./MagicCap.app/Contents/MacOS
mkdir ./MagicCap.app/Contents/Resources
cp ./assets/macos/info.plist ./MagicCap.app/Contents/info.plist
cp ./magiccap-darwin ./MagicCap.app/Contents/MacOS/MagicCap
cp ./assets/macos/icon.icns ./MagicCap.app/Contents/Resources/icon.icns
# TODO: Change icon!
