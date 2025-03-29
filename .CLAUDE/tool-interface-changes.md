# Tool Interface Changes Documentation

## Background

The project underwent a module system transition to ESM, which exposed issues with the Tool interface that were previously overlooked with the older module resolution. This document explains the key changes made to fix these issues.

## Essential Changes

### 1. Updated Tool Interface (src/Tool.ts)

The original Tool interface was minimal with only 5 properties:
```typescript
export interface Tool {
  name: string
  description?: string
  inputSchema: z.ZodObject<any>
  inputJSONSchema?: Record<string, unknown>
  prompt: (options: { dangerouslySkipPermissions: boolean }) => Promise<string>
}
```

However, actual tool implementations used many more properties and methods. The updated interface now properly includes:

- Added all missing properties and methods used in implementations
- Made the Tool interface generic for input/output types
- Created ToolUseContext interface for the context object
- Added ValidationResult interface for input validation results
- Added SetToolJSXFn type for UI rendering
- Made renderToolUseRejectedMessage accept parameters matching actual usage

This ensures all tool implementations conform to a consistent interface structure.

### 2. JSON Module Import (src/constants/macros.ts)

Updated JSON imports to use modern ESM syntax:
```typescript
import pkg from '../../package.json' with { type: 'json' }
```

- Changed from named import to default import (JSON modules expose content as default export)
- Updated to use `with` syntax instead of older `assert` syntax
- Accesses properties via the imported object (pkg.version)

### 3. Module Resolution Settings

Updated tsconfig files to use NodeNext module resolution for better ESM compatibility.

## Temporary Tools

The following tools were created to help with the transition but may not be needed long-term:

1. **build-temp-test.js**: Allows building the project despite type errors
2. **fix-imports.js**: Fixes ES module imports in compiled JS files by adding .js extensions
3. **tsconfig.build.test.json**: Contains relaxed type checking settings

These can be retained until all type errors are addressed throughout the codebase.

## Future Work

1. Fix remaining type errors in other components
2. Remove temporary build tools once all errors are resolved
3. Consider updating other interfaces using similar patterns