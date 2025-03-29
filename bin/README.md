# bin directory

This directory contains the executable entry point for the anon-kode CLI tool.

- `kode.js` - The main entry point script that imports and executes the compiled TypeScript code.

When this package is installed globally via `npm install -g anon-kode`, the `kode` command becomes available in the user's PATH and executes this script, which then loads the compiled application code from the dist directory.
