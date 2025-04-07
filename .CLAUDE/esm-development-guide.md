# ESM Development Guide

## TypeScript Configuration

### Critical Configuration Settings
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "module": "ES2022",
    "target": "ES2023",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

> ⚠️ **IMPORTANT: DO NOT CHANGE THESE SETTINGS** ⚠️
> 
> The current configuration using `bundler` moduleResolution with ES2022/ES2023 is intentional and allows for optimal compatibility while minimizing code changes.

### Why These Settings Work
1. **bundler** moduleResolution lets us:
   - Use imports without .js extensions
   - Maintain compatibility with TypeScript
   - Avoid updating 1,140+ import statements with .js extensions

2. **ES2022 module** setting enables:
   - Top-level await
   - Import assertions (for JSON imports)
   - Dynamic imports

3. **ES2023 target** provides:
   - Modern language features like the `with` keyword for imports

## Build & Development Scripts

### Development
```bash
# Run directly with tsx (recommended)
pnpm run dev

# With verbose debugging
NODE_ENV=development pnpm run dev --verbose --debug
```

### Building
```bash
# Standard build
pnpm run build

# Build despite TypeScript errors (for testing)
node build-temp.js
```

### Node.js Compatibility
- **Development with tsx**: Node.js 18.16.0+ (current LTS)
- **Running compiled code directly**: Node.js 20.0.0+ required
- **Using the script wrapper**: Works with Node.js 18+

## Working with TypeScript Errors

### TypeScript Error Handling Scripts

1. **build-temp.js**
   - Allows building despite type errors
   - Useful during migration and testing phases
   ```bash
   node build-temp.js
   ```

2. **fix-imports.js**
   - Fixes ES module imports in compiled JS files
   - Adds .js extensions to imports in the dist directory
   ```bash
   node fix-imports.js
   ```

### Finding & Filtering Errors
```bash
# Get total error count
node build-temp.js | grep -E "error TS[0-9]+" | wc -l

# Filter for specific error types
node build-temp.js | grep -E "error TS[0-9]+" | grep "Property"

# Filter for errors in specific files
node build-temp.js | grep -E "error TS[0-9]+" | grep "FileName.tsx"
```

## Common ESM Pitfalls & Solutions

### 1. Missing File Extensions
**Error**: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/path/to/module'`

**Solution**:
- Add `.js` extension to all local import paths in compiled code
- Our build process handles this automatically with fix-imports.js
- TypeScript source can use extensionless imports due to bundler moduleResolution

### 2. JSON Imports
**Error**: `SyntaxError: Unexpected token '{'`

**Solution**:
```typescript
// Modern Node.js 20+ syntax
import data from './data.json' with { type: 'json' };

// Older Node.js compatibility approach
import fs from 'fs/promises';
const data = JSON.parse(await fs.readFile('./data.json', 'utf8'));
```

### 3. Dynamic Imports
**Error**: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module during dynamic import`

**Solution**:
```typescript
// Proper dynamic import in ESM
const module = await import('./path/to/module.js');

// For conditional imports
try {
  const module = await import('./optional-module.js');
  // Use module
} catch (error) {
  // Fallback behavior
}
```

### 4. Module Initialization Order
**Pitfall**: Static imports are evaluated before any code runs, which may cause initialization order issues

**Solution**:
```typescript
// Prefer lazy initialization pattern
import { moduleInterface } from './module.js';

// Initialize when needed, not at import time
function useModule() {
  moduleInterface.initialize();
  return moduleInterface.doSomething();
}
```

## Testing for ESM-Specific Issues

### Runtime Verification Script
The `esm-test-script.js` helps identify ESM-related issues:

```bash
node .CLAUDE/esm-test-script.js
```

### Node.js Version Verification
If you encounter unexpected syntax errors (like issues with `with`):

```bash
# Check Node.js version
node --version

# Use the version-specific runner script
./run-with-node22.sh
```

## Support Resources

- [TypeScript ESM Documentation](https://www.typescriptlang.org/docs/handbook/esm-node.html)
- [Node.js ESM Documentation](https://nodejs.org/api/esm.html)
- Internal files:
  - esm-changes-summary.md (Architecture decisions)
  - esm-testing-plan.md (Testing status and issues)