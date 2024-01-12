#!/bin/bash

find ./dist/cjs -type f -name '*.js' -exec sh -c 'sed -i "" "s/\.js/.cjs/g" "$0" && mv "$0" "${0%.js}.cjs"' {} \;
