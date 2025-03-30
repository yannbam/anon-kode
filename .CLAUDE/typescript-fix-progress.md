# TypeScript ESM Migration Progress Report

## Overview

This document summarizes our progress in migrating the codebase to use ES Modules (ESM) with TypeScript and fixing related type errors. We've made significant progress, but there are still several categories of errors to address.

## Current State

- **Branch**: `fix/typescript-errors`
- **Module System**: ESM with `moduleResolution: "bundler"` and `module: "ES2022"`
- **Target**: ES2023
- **Fixed Files**:
  - Tool.ts interface
  - Several React components (Link, AsciiLogo, FallbackToolUseRejectedMessage, etc.)
  - JSON imports in macros.ts
  - LogOption interface expansion

## Approach Used

1. Created a systematic plan to address errors by category
2. Fixed React component interfaces first using the React.FC pattern 
3. Used interface instead of type for component props
4. Fixed core type definitions in the logs module
5. Updated macros.ts to use compatible dynamic JSON imports

## Remaining Type Errors

From our analysis of the build output, the remaining errors fall into these categories:

### 1. 'key' Props in React Components (~30%)
```typescript
Property 'key' does not exist on type 'Props'
```
These need to be fixed by removing 'key' from component props being passed directly.

### 2. Missing 'children' in Component Props (~15%)
```typescript
Property 'children' is missing in type '{}' but required in type 'Props'
```
Components need either:
- Children prop made optional with '?'
- Children explicitly provided when calling components

### 3. Cannot Find Module/Namespace Issues (~15%)
```typescript
Cannot find namespace 'React'
Cannot find module '../types/notebook' 
```
Need to:
- Add consistent React imports
- Create missing type files

### 4. Type Mismatch in Service Methods (~10%)
```typescript
Expected 6 arguments, but got 7
Type 'AnthropicBedrock' is missing properties
```
Service method signatures need updating.

### 5. Missing Properties on Objects (~10%)
```typescript
Property 'PACKAGE_URL' does not exist on type '{ readonly VERSION: string; README_URL: string; }'
Property 'reasoning' does not exist on type 'ChatCompletionMessage'
```
Need to add missing properties to objects.

### 6. Unused @ts-expect-error Directives (~5%)
Need to address or remove these unused directives.

### 7. Other Miscellaneous Issues (~15%)

## Next Steps for Continuing

1. **Create Missing Type Files First**
   - Create any missing type files referenced in imports
   - Focus on '../types/notebook' and other critical dependencies

2. **Fix React Components Systematically**
   - Fix 'key' prop issues - Remove key from component Props type definitions
   - Fix required children props - Make optional or provide explicitly
   - Use React.FC<PropsType> pattern consistently

3. **Address Service Type Issues**
   - Align parameter counts in function signatures
   - Fix type mismatches in API clients

4. **Clean Up Directive Issues**
   - Address unused @ts-expect-error directives

5. **Final Pass with build-temp-test.js**
   - Verify fixes with full test build

## Implementation Patterns

### Pattern for React Components
```typescript
import * as React from 'react';

interface ComponentProps {
  requiredProp: string;
  optionalProp?: number;
  children?: React.ReactNode; // Make children optional
}

export const Component: React.FC<ComponentProps> = ({
  requiredProp,
  optionalProp,
  children,
}) => {
  // Implementation
  return (
    <div>{children}</div>
  );
};
```

### Pattern for Removing 'key' Props
When mapping components in arrays, use this pattern:
```typescript
{items.map((item, index) => (
  // key goes here on the element, not passed to Props
  <Component 
    key={index}
    // other props
  />
))}
```

### Pattern for Missing Type Files
Create skeleton type files with essential interfaces:
```typescript
// src/types/notebook/index.ts
export interface Notebook {
  cells: NotebookCell[];
  metadata: any;
}

export interface NotebookCell {
  cell_type: 'code' | 'markdown';
  source: string[];
  // Add other properties as needed
}
```

### Strategy for Service Type Issues
When fixing function parameter mismatches:
1. First identify the correct parameter count in the implementation
2. Match the type signature to the implementation
3. Consider using optional parameters for backward compatibility

## Tools and Commands

- **Build Test**: `node build-temp-test.js`
- **Direct Type Check**: `npx tsc --noEmit src/path/to/file.tsx`