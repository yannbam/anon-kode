# ESM Runtime Troubleshooting Guide

This guide contains solutions for common runtime errors encountered after migrating to ES Modules.

## Common ESM Runtime Errors

### 1. Missing File Extensions

**Error Pattern:**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/path/to/module'
```

**Solution:**
- Add `.js` extension to all local import paths
- Example: Change `import { foo } from './utils/helpers'` to `import { foo } from './utils/helpers.js'`
- Use the fix-imports.js script to automate this process
- Look for imports that may have been missed by the script

### 2. __dirname and __filename Not Available

**Error Pattern:**
```
ReferenceError: __dirname is not defined in ES module scope
```

**Solution:**
- Replace with the ESM equivalent:
```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### 3. Dynamic Import Issues

**Error Pattern:**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module during dynamic import
```

**Solution:**
- Ensure dynamic imports have proper file extensions
- Use the complete path: `await import('./path/to/module.js')`
- For conditional imports, ensure all paths are valid

### 4. Module Specifier Issues

**Error Pattern:**
```
Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only file and data URLs are supported by the default ESM loader
```

**Solution:**
- Fix import URLs that use unsupported protocols
- Use only `file:` protocol or relative paths
- For JSON imports, use `import with { type: 'json' }` syntax

### 5. Package.json Type Field Conflicts

**Error Pattern:**
```
Error [ERR_REQUIRE_ESM]: Module is an ES Module and cannot be loaded by require()
```

**Solution:**
- Check that the "type": "module" field is in package.json
- Ensure no code is using require() to load ESM modules
- Replace require() calls with dynamic imports: `const module = await import('./module.js')`

### 6. Default Export vs Named Export Confusion

**Error Pattern:**
```
TypeError: module is not a function
```

**Solution:**
- Check if you're importing a default export as a named export or vice versa
- Default export: `import myModule from './module.js'`
- Named export: `import { myModule } from './module.js'`
- Make imports match exports consistently

### 7. Circular Dependencies

**Error Pattern:**
```
ReferenceError: Cannot access 'X' before initialization
```

**Solution:**
- Refactor to avoid circular dependencies
- Move shared code to a separate module
- Use dynamic imports to break circles: `const module = await import('./circular.js')`

### 8. JSON Import Issues

**Error Pattern:**
```
SyntaxError: Unexpected token '{'
```

**Solution:**
- Use proper JSON import syntax for Node.js 17+:
```javascript
import data from './data.json' assert { type: 'json' };
```
- For older Node.js versions, use dynamic import:
```javascript
const data = JSON.parse(await fs.readFile('./data.json', 'utf8'));
```

### 9. Top-level Await Issues

**Error Pattern:**
```
SyntaxError: await is only valid in async functions and the top level bodies of modules
```

**Solution:**
- Ensure Node.js version supports top-level await (14.8.0+ with --harmony flag, or 14.18.0+ without flag)
- If needed, wrap code in an async IIFE:
```javascript
(async () => {
  const result = await someAsyncOperation();
  // rest of code
})();
```

### 10. Missing Namespace Imports

**Error Pattern:**
```
TypeError: module.someFunction is not a function
```

**Solution:**
- Check if you need to use namespace import:
```javascript
import * as module from './module.js';
```
- Or use specific named imports:
```javascript
import { someFunction } from './module.js';
```

## Testing Strategies

### Verbose Error Logging

Run the application with these flags to get more detailed error information:

```bash
NODE_ENV=development pnpm run dev --verbose --debug
```

### Trace Warnings for Unhandled Promises

Use this flag to detect unhandled promise rejections:

```bash
node --trace-warnings .
```

### Debugging Module Resolution

Set this environment variable to debug module resolution issues:

```bash
NODE_DEBUG=module node .
```

## Incremental Testing Approach

1. Test core functionality first
2. Test one feature at a time
3. Document all errors in detail
4. Apply fixes systematically 
5. Verify each fix before moving on

Remember that ESM errors can cascade - fixing one may reveal others that were previously masked.
