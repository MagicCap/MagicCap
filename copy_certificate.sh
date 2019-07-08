#!/bin/sh
# Heavily based off http://svilar.me/2015/codesign-electron-continuous-integration/. Thanks for the article, you saved my shit. <3

KEY_CHAIN=~/certs.keychain

security create-keychain -p circle $KEY_CHAIN
# Make the keychain the default so identities are found
security default-keychain -s $KEY_CHAIN
# Unlock the keychain
security unlock-keychain -p circle $KEY_CHAIN
# Set keychain locking timeout to 3600 seconds
security set-keychain-settings -t 3600 -u $KEY_CHAIN

# Saves the certificate.
echo $P12_DATA | base64 --decode - > ./Certificates.p12

# Add certificates to keychain and allow codesign to access them
security import ./Certificates.p12 -k $KEY_CHAIN -P "" -T /usr/bin/codesign

rm ./Certificates.p12
