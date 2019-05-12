#!/usr/bin/env bash

# Thanks DigitalOcean for the base for this build script, you're awesome!

echo 'Installing requirements...'
go get github.com/kbinani/screenshot
go get github.com/lxn/win
go get golang.org/x/sys/windows
go get github.com/BurntSushi/xgb
go get github.com/gen2brain/shm
go get github.com/satori/go.uuid
echo 'Building...'

platforms=("windows/amd64" "linux/amd64" "darwin/amd64" "freebsd/amd64")

for platform in "${platforms[@]}"
do
    platform_split=(${platform//\// })
    GOOS=${platform_split[0]}
    GOARCH=${platform_split[1]}
    output_name='./bin/screenshot-display-'$GOOS
    if [ $GOOS = "windows" ]; then
        output_name='./bin/screenshot-display-win32.exe'
    fi  

    env GOOS=$GOOS GOARCH=$GOARCH go build -o $output_name screenshot-display.go
    if [ $? -ne 0 ]; then
        echo 'An error has occurred! Aborting the script execution...'
        exit 1
    fi
done


g++ get-visible-windows.cpp -framework ApplicationServices -o ./bin/get-visible-windows-darwin
