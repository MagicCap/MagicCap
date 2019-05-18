#!/bin/sh
echo $P12_CERT | base64 --decode -o ./private.p12
sudo -E security import ./private.p12 -P $P12_PASSWORD -k /Library/Keychains/System.keychain
rm ./private.p12
npm i -g electron-osx-sign
sudo security unlock-keychain -u /Library/Keychains/System.keychain
sudo electron-osx-sign --identity="Developer ID Application: Jake Gealer (S7UG4ZL2KJ)" ./build/MagicCap-darwin-x64/MagicCap.app
