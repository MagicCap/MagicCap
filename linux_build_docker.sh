#!/bin/sh

# If errors happen, throw them immediately.
set -e

# Ensure docker is configured to allow for multi-arch building.
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes

# Run the build.
docker build -f Dockerfile.build . -t magiccap-builder
docker run -v $(pwd):/var/magiccap-mount --name magiccap-builder magiccap-builder
docker rm magiccap-builder
docker image rm --force magiccap-builder
