# Build Process Documentation

This document describes the build process for the anon-kode package.

## Overview

The build process has been updated to follow standard TypeScript package conventions:

1. TypeScript files are compiled to JavaScript using the TypeScript compiler (`tsc`)
2. The compiled JavaScript files are placed in the `dist` directory
3. The package entry point is a small JavaScript file in the `bin` directory that imports the compiled code

## Build Scripts

The package.json defines the following scripts:

- `dev`: Runs the application directly from TypeScript source using `tsx`
- `build`: Compiles the TypeScript code to JavaScript using `tsc`
- `prepublishOnly`: Automatically runs the build script before publishing to npm

## Package Structure

- `src/`: Contains all TypeScript source code
- `dist/`: Contains compiled JavaScript (generated during build)
- `bin/`: Contains the executable entry point script
- `yoga.wasm`: WASM binary included in the package

## npm Global Installation

When installed globally with `npm install -g anon-kode`, the `kode` command becomes available in the user's PATH and executes the `bin/kode.js` script, which then loads the compiled application code.

## Development Workflow

1. Make changes to TypeScript files in the `src` directory
2. For local development, use `npm run dev` to run directly from source
3. Before publishing, run `npm run build` to compile TypeScript to JavaScript
4. When ready to publish, simply run `npm publish` (the build will automatically run via prepublishOnly)