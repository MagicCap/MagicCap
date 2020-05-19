#!/bin/sh
set -e
git clone https://github.com/jakemakesstuff/ironfist
mkdir ./ironfist/app_contents
cp ./.ironfist.json ./ironfist/app_contents/.ironfist.json
cp ./magiccap-darwin ./ironfist/app_contents/magiccap
cd ./ironfist
GO111MODULE=off sh ./bundle.sh
cp ./bundled_application ../magiccap-bundled
cp ./app_contents.zip ../application_bundle.zip
cd ..
rm -rf ./ironfist
