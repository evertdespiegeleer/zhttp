#!/bin/bash

NPM_VERSION_COMMAND=$@
NPM_VERSION_ARGS="--no-commit-hooks --no-git-tag-version --no-workspaces-update"

# # Update the root version
npm version --quiet $NPM_VERSION_ARGS $NPM_VERSION_COMMAND

export NEW_VERSION=$(cat package.json | jq -r '.version')

# Update all package versions
npm version --quiet --workspaces $NPM_VERSION_ARGS $NEW_VERSION

# Update all dependencies
find . -name 'package.json' -not -path "**/node_modules/*" -type f | while read -r file; do
    cat $file  | perl -pe 's/(\"\@zhttp\/.+?\")\: \".+?\"/$1\: \"$ENV{NEW_VERSION}\"/g' > "$file.new"
    mv "$file.new" $file
done

npm i

echo $NEW_VERSION
exit 0