# Build Scripts

This directory contains scripts used in the build process of anon-kode.

## Available Scripts

### `build.js`
The main production build script. It compiles TypeScript files and fixes module imports.

Usage:
```bash
node scripts/build.js
```

### `fix-imports.js`
Fixes ES module imports in compiled JS files by adding .js extensions and fixing .tsx.js extensions.
This is necessary because TypeScript doesn't automatically add these extensions in ESM mode.

Usage:
```bash
node scripts/fix-imports.js
```

### `find-imports.js`
A utility to find import statements that need .js extensions. Useful for debugging ESM import issues.

Usage:
```bash
node scripts/find-imports.js
```

## ESM Module Configuration

The project uses:
- `moduleResolution: "bundler"` in tsconfig.json
- `module: "ES2022"` for modern ESM features

This configuration enables:
- Clean imports without .js extensions in the source code
- Proper TypeScript compilation to ESM modules
- Addition of necessary .js extensions in compiled code via fix-imports.js

## npm Scripts

These scripts are available through npm commands:
- `npm run build` - Main build command
- `npm run fix-imports` - Run the fix-imports script directly
- `npm run analyze-imports` - Run the find-imports utility