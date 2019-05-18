#!/bin/sh
echo $P12_CERT | base64 --decode -o ./private.p12
security import ./private.p12 -P $P12_PASSWORD
rm ./private.p12
npm i -g electron-osx-sign
electron-osx-sign --identity="Developer ID Application: Jake Gealer (S7UG4ZL2KJ)" ./build/MagicCap-darwin-x64/MagicCap.app
