# ESM Migration: Key Changes & Architecture

## Architecture Decisions

### Module System Approach
- **Module Type**: Project uses native ESM modules (`"type": "module"` in package.json)
- **ModuleResolution**: Set to `"bundler"` in tsconfig.json
- **Module Setting**: Set to `"ES2022"` for modern ESM features
- **Target**: Set to `"ES2023"` for latest language features
- **Hybrid Approach**: Uses import paths without .js extensions (resolved by bundler)

### Rationale
The project deliberately chose a hybrid approach to minimize code changes. A full ESM transition would require updating 1,140+ imports with `.js` extensions. The bundler module resolution system allows:
1. Full ESM compatibility as a proper ESM package
2. Clean import syntax without verbose `.js` extensions
3. Build compatibility with TypeScript compiler in modern projects

## Runtime Fixes Implemented

### 1. Package.json Loading
- **Issue**: Failed to load package.json when running as ESM
- **Fix**: Used fs/promises to read package.json at runtime
- **File**: Modified `src/constants/macros.ts` to use Node.js File System API

### 2. React Rendering Issues
- **Fixed**: "Each child in a list should have a unique 'key' prop" warning
- **Fixed**: "Text string must be rendered inside `<Text>` component" error
- **Approach**: Added unique key props to React elements, wrapped text in Ink's `<Text>` components

### 3. Node.js Version Compatibility
- **Issue**: Import errors with newer syntax like `import with`
- **Solution**: Verified Node.js version requirements in package.json
- **Required**: Node.js v20+ for direct execution, v18+ for development with tsx

## TypeScript Type Fixes

### 1. Tool Interface Updates
- Updated Tool interface to include all used properties and methods
- Made Tool interface generic for input/output types
- Added proper typings for ToolUseContext, ValidationResult, etc.

### 2. Type Declarations
- Added proper type declarations for Sharp library
- Created type definition files for logs and notebooks
- Fixed import references for module resolution

### 3. React Component Type Patterns
- Fixed component props with correct React typing patterns
- Made children props optional with proper typing
- Fixed key prop handling in list components

## Build Process Changes

### Updated Build Flow
- TypeScript compiled to JavaScript using tsc
- Compiled files placed in `dist` directory
- Entry point in `bin` directory imports compiled code

### Build Scripts
- `dev`: Runs app directly from TypeScript source using `tsx`
- `build`: Compiles TypeScript to JavaScript using `tsc`
- `prepublishOnly`: Automatically runs build before publishing

### Supporting Tools
- `build-temp.js`: Allows building despite type errors
- `fix-imports.js`: Fixes ES module imports in compiled files