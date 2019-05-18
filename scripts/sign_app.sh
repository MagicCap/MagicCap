#!/bin/sh
security create-keychain -p circle circle.keychain
security unlock-keychain -p circle circle.keychain
echo $P12_CERT | base64 --decode -o ./private.p12
security import ./private.p12 -k circle.keychain -P $P12_PASSWORD
rm ./private.p12
npm i -g electron-osx-sign
electron-osx-sign --keychain=circle.keychain --identity="Developer ID Application: Jake Gealer (S7UG4ZL2KJ)" ./build/MagicCap-darwin-x64/MagicCap.app
