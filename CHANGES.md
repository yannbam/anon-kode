# Node.js Compatibility Changes

## Overview

This document details the changes made to run the application without Bun on older CPUs that don't support the latest CPU instructions required by Bun. The solution involves a JavaScript launcher script that uses TSX to run the TypeScript code directly, avoiding the need for bundling.

## Problem

The original build system relied on Bun to build and bundle the application:

```javascript
"scripts": {
  "dev": "tsx ./src/entrypoints/cli.tsx --verbose",
  "build": "bun build src/entrypoints/cli.tsx --minify --outfile cli.mjs --target=node"
}
```

This presented two main challenges:
1. Bun requires newer CPUs with specific instruction sets
2. Bundling a complex Node.js terminal application with many native dependencies is problematic

## Solution

The chosen approach uses a launcher script to run the TypeScript files directly using TSX, which is a fast TypeScript executor. This approach:

1. Avoids bundling issues with dynamic requires and Node.js native modules
2. Works on any system that can run Node.js without requiring Bun
3. Maintains the original source code structure without modifications

### Key Changes

1. **CLI Launcher Script (`cli-launcher.mjs`)**

   Created a new launcher script that:
   - Locates the TSX binary in common installation paths
   - Falls back to using NPX if TSX isn't installed globally
   - Passes all command-line arguments to the TypeScript entrypoint
   - Sets appropriate environment variables to suppress warnings

   ```javascript
   #!/usr/bin/env node
   import { spawn } from 'child_process';
   import { dirname, join } from 'path';
   import { fileURLToPath } from 'url';
   import { existsSync } from 'fs';

   const __dirname = dirname(fileURLToPath(import.meta.url));
   const srcEntrypoint = join(__dirname, 'src/entrypoints/cli.tsx');

   // Try to find the tsx binary on the system
   const possibleTsxPaths = [
     '/usr/local/bin/tsx',
     '/usr/bin/tsx',
     join(process.env.HOME || '', '.nvm/versions/node/v22.14.0/bin/tsx'),
     'npx'
   ];

   let command = '';
   let args = [];

   for (const path of possibleTsxPaths) {
     if (path === 'npx' || existsSync(path)) {
       if (path === 'npx') {
         command = 'npx';
         args = ['--yes', 'tsx', srcEntrypoint, ...process.argv.slice(2)];
       } else {
         command = path; 
         args = [srcEntrypoint, ...process.argv.slice(2)];
       }
       break;
     }
   }

   if (!command) {
     console.error('Could not find tsx. Please install it with: npm install -g tsx');
     process.exit(1);
   }

   // Run the command
   const child = spawn(command, args, {
     stdio: 'inherit',
     shell: true,
     env: {
       ...process.env,
       // Ensure experimental warnings are suppressed
       NODE_NO_WARNINGS: '1'
     }
   });

   child.on('exit', (code) => {
     process.exit(code || 0);
   });
   ```

2. **Package.json Changes**

   Modified the package.json file:
   - Changed the binary entry point to use the new launcher script
   - Updated the files array to include the source directory
   - Simplified the build script to just make the launcher executable
   - Added typescript and downgraded tsx to a more compatible version

   ```diff
   "bin": {
   -  "kode": "cli.mjs"
   +  "kode": "cli-launcher.mjs"
   },
   
   "files": [
   -  "cli.mjs",
   +  "cli-launcher.mjs",
     "yoga.wasm",
   +  "src"
   ],
   
   "scripts": {
     "dev": "tsx ./src/entrypoints/cli.tsx --verbose",
   -  "build": "bun build src/entrypoints/cli.tsx --minify --outfile cli.mjs --target=node"
   +  "build": "chmod +x cli-launcher.mjs"
   },
   
   "devDependencies": {
     "react-devtools-core": "^6.1.1",
   -  "tsx": "^4.19.3"
   +  "tsx": "^3.12.10",
   +  "typescript": "^5.4.5"
   }
   ```

3. **TSConfig for Future Needs**

   Added a `tsconfig.build.json` file for potential future TypeScript builds:

   ```json
   {
     "extends": "./tsconfig.json",
     "compilerOptions": {
       "outDir": "dist",
       "sourceMap": true,
       "declaration": false,
       "declarationMap": false,
       "noEmit": false,
       "module": "NodeNext",
       "moduleResolution": "NodeNext",
       "types": ["node"]
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "**/*.test.ts", "**/*.test.tsx"]
   }
   ```

## Node.js Version Requirements

The application was tested and works with:
- Node.js v22.14.0 (LTS)
- Global installation of tsx (`npm install -g tsx`)

## Usage Instructions

1. Install Node.js LTS (v20+) using NVM or from the Node.js website
   ```bash
   # With NVM
   nvm install --lts
   nvm use --lts
   ```

2. Install dependencies with legacy peer dependencies flag
   ```bash
   npm install --legacy-peer-deps
   ```

3. Install TSX globally
   ```bash
   npm install -g tsx
   ```

4. Running the application
   - Development mode: `npm run dev`
   - Direct execution: `./cli-launcher.mjs` (after `npm run build`)

## Benefits

1. **CPU Compatibility**: Works on older CPUs that don't support Bun
2. **Development Experience**: Uses the same TypeScript source code without bundling
3. **Simpler Builds**: Avoids complex bundling configurations and potential errors
4. **Native Module Support**: Preserves Node.js native module functionality
5. **Maintainability**: Requires minimal changes to the original codebase

## Limitations

1. **Performance**: May be slower than the Bun-bundled version
2. **Global Dependency**: Requires TSX to be installed globally
3. **Package Size**: The published package will be larger as it includes source files

## Future Improvements

1. Package the application with a tool like `pkg` to create standalone executables
2. Add support for automatically installing TSX if not found
3. Implement a proper TypeScript build process if bundling is needed in the future