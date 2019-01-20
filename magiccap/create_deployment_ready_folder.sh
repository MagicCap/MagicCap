#!/bin/bash
if [  ! -d "./deployment" ]; then
  mkdir deployment
  mv ./build/MagicCap.dmg ./deployment/magiccap-mac.dmg
  cd ./build/MagicCap-linux-x64
  7z a ../../deployment/magiccap-linux.zip *
  cd ../MagicCap-darwin-x64
  7z a ../../deployment/magiccap-mac.zip *
  cd ../../
  export ALREADY_RAN_PACKAGER="true"
fi
