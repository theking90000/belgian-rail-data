#!/bin/sh

mkdir -p target

name=$(cat package.json | jq -r '.name')
version=$(cat package.json | jq -r '.version')

out=target/$name-$version

bun build --compile --target=bun-linux-x64-modern --outfile=$out-linux-x64 ./src
chmod +x $out