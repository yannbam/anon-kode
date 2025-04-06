# TypeScript ESM Migration: Consolidated Guide

## Current State & Configuration

- **Branch**: `fix/typescript-errors`
- **TypeScript Configuration**:
  - `moduleResolution: "bundler"` 
  - `module: "ES2022"` 
  - `target: "ES2023"`

> **⚠️ IMPORTANT: DO NOT CHANGE THE TYPESCRIPT CONFIGURATION ⚠️**  
> The current configuration with bundler moduleResolution and ES2022/ES2023 is the correct and final decision for this codebase.

## Completed Fixes

1. **Tool Interface Updates**:
   - Added missing properties and methods
   - Made the interface generic for input/output types
   - Added proper typings for ToolUseContext, ValidationResult, etc.

2. **React Component Patterns**:
   - Fixed several components using React.FC<Props> pattern
   - Made children optional with ? where appropriate
   - Used interface instead of type for component props

3. **Type Definitions**:
   - Created types/logs module with LogOption interface
   - Created types/notebook module with Notebook interfaces
   - Fixed missing exports

4. **JSON Imports**:
   - Updated to use ESM-compatible dynamic imports
   - Added missing PACKAGE_URL to macros.ts

## Remaining Error Categories

1. **'key' Props in React Components (~30%)**:
   - Remove 'key' from Props interfaces (it's a special React prop)
   - Add keys directly on elements in .map() functions

2. **Missing 'children' Props (~15%)**:
   - Make children optional in Props interfaces
   - Add children prop explicitly where needed

3. **React Namespace Issues (~15%)**:
   - Add `import * as React from 'react'` consistently
   - Fix JSX namespace issues

4. **Service Implementation Mismatches (~10%)**:
   - Fix function parameter counts in openai.ts and claude.ts
   - Update interfaces to match implementations

5. **Missing Properties (~10%)**:
   - Fix specific object property accesses
   - Update interfaces to include all used properties

## Implementation Patterns for Fixes

### React Components Pattern
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
  return (
    <div>{children}</div>
  );
};
```

### Removing 'key' from Props
Use this pattern when mapping:
```typescript
{items.map((item, index) => (
  // key goes on the element, not in Props
  <Component 
    key={index}
    // other props
  />
))}
```

### Missing Type Files Pattern
Create type files with essential interfaces:
```typescript
// Example for missing types
export interface MissingType {
  requiredField: string;
  optionalField?: number;
}
```

## Project Build and Testing

- Build test command: `node build-temp-test.js`
- Always test your changes to ensure they don't introduce new errors
- Make focused commits for each category of fixes

## Implementation Approach

1. Start with high-impact fixes first (React component props)
2. Fix files one category at a time, not randomly
3. Use consistent patterns across similar components
4. Test frequently with the build script
5. Commit changes in small, logical groupings

**Remember: Focus on type correctness without changing functionality!**
