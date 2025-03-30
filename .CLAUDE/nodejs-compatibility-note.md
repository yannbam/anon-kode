# Node.js Compatibility Note

## Overview

This document explains the Node.js version compatibility requirements for running the anon-kode application directly with Node.js versus using tsx.

## Issue

When trying to run the compiled JavaScript directly with Node.js:

```bash
node dist/entrypoints/cli.js
```

You may encounter the following error:

```
SyntaxError: Unexpected token 'with'
```

This error occurs because the codebase (or one of its dependencies) uses modern ECMAScript features like import attributes (`import ... with { type: 'json' }`) which are not fully supported in older Node.js versions.

## Compatibility

- **Development with tsx**: Works with Node.js 18.16.0+ (current LTS)
- **Running compiled code directly**: Requires Node.js 20.0.0+ for full compatibility with all ESM features

## Solutions

1. **Preferred: Use tsx for development and running**
   ```bash
   # Development
   npm run dev
   
   # Or directly
   npx tsx ./src/entrypoints/cli.tsx
   ```

2. **Alternative: Upgrade Node.js**
   If you need to run the compiled JavaScript directly, upgrade to Node.js 20+:
   ```bash
   # Using nvm (Node Version Manager)
   nvm install 20
   nvm use 20
   
   # Then you can run
   node dist/entrypoints/cli.js
   ```

3. **For package users**
   The `bin/kode.js` script handles compatibility issues correctly, so global installation and the `kode` command will work on the required Node.js version (18+).

## Technical Details

The issue is related to ESM's JSON import assertions which became import attributes in newer ECMAScript specifications. Dependencies like `@inkjs/ui` use these features for importing JSON files.

Node.js 18 supports import assertions with the older syntax:
```javascript
import data from './data.json' assert { type: 'json' };
```

While Node.js 20+ supports the newer import attributes:
```javascript
import data from './data.json' with { type: 'json' };
```

Some dependencies may be using the newer syntax, causing compatibility issues with Node.js 18.
