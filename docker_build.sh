#!/bin/sh
docker build . -f ./Dockerfile.build -t magiccap-builder
docker run -it -v $(pwd):/out magiccap-builder
