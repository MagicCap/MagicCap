#!/bin/sh
set -e
docker build -f Dockerfile.build . -t magiccap-builder
docker run -v $(pwd):/var/magiccap-mount --name magiccap-builder magiccap-builder
docker rm magiccap-builder
docker image rm --force magiccap-builder
