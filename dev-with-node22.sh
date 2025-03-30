#!/bin/bash

# Use Node v22 to run tsx
/home/jan/.nvm/versions/node/v22.14.0/bin/node ./node_modules/.bin/tsx ./src/entrypoints/cli.tsx "$@"
