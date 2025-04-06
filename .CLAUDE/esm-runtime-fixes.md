# ESM Migration Runtime Fixes

## 1. Fixed: Package.json Loading Issue

**Issue:**
- When running `node bin/kode.js`, the error "Failed to load package.json" was encountered
- Root cause: In ESM modules, JSON imports must be handled differently than in CommonJS

**Solution:**
- Modified `src/constants/macros.ts` to use the Node.js File System API directly
- Used `readFile` from `fs/promises` to load package.json
- Used proper ESM path resolution with `fileURLToPath` and `dirname`
- Replaced the dynamic import approach with a more reliable file reading approach

**Code Changes:**
```typescript
// Read package.json at runtime
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the directory name in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packagePath = resolve(__dirname, '../../package.json');

let packageVersion = '0.0.0';

// Load package version from package.json
readFile(packagePath, 'utf8')
  .then(data => {
    try {
      const pkg = JSON.parse(data);
      packageVersion = pkg.version || '0.0.0';
    } catch (parseErr) {
      console.error('Error parsing package.json:', parseErr);
    }
  })
  .catch(err => {
    console.error('Failed to load package.json:', err);
  });
```

## 2. Verified: Node.js Version Compatibility Issue

**Issue:**
- After fixing the package.json loading, encountered error with `import with` syntax in dependencies
- Error: `SyntaxError: Unexpected token 'with'` from @inkjs/ui/node_modules/cli-spinners/index.js
- Root cause: Using Node.js v18.16.0 which doesn't support the newer JSON import assertion syntax with the `with` keyword

**Verification:**
- Checked package.json and confirmed `"engines": { "node": ">=20.0.0" }`
- Using NVM, current active version is v18.16.0
- Found Node.js v22.14.0 is also installed on the system

**Required Action:**
1. Use Node.js v22.14.0 for this project via NVM
2. Run: `nvm use 22` or specify the version in the .nvmrc file

**Implementation:**
- The project has an .nvmrc file that specifies Node.js v22
- NVM will automatically use this version if `nvm use` is run in the project directory

## General Notes on ESM Transition

1. **Path Resolution Changes:**
   - ESM requires explicit file extensions in import paths
   - No automatic .js extension resolution like in CommonJS

2. **No __dirname/__filename:**
   - These variables aren't available in ESM
   - Must use import.meta.url with fileURLToPath/dirname

3. **JSON Import Changes:**
   - Can't directly import JSON in older Node.js versions
   - In Node.js 20+: `import data from './data.json' with { type: 'json' }`
   - Fallback: Use fs to read JSON files directly

4. **Dependency Compatibility:**
   - Some dependencies might use newer ESM features not supported in older Node.js versions
   - Need to ensure dependencies are compatible with your Node.js version
