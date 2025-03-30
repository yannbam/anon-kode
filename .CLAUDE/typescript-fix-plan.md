# TypeScript Fixes Implementation Plan

## Overview

This document outlines our systematic plan for fixing TypeScript errors in the project while maintaining the ESM/bundler module system.

## Key Issues Identified

1. **Module Resolution Issues**:
   - TypeScript isn't resolving modules correctly when using direct `tsc` checks
   - Solution: Use project-specific tsconfig for analysis

2. **JSX Compilation Issues**:
   - JSX isn't recognized during standalone checks
   - Solution: Ensure 'jsx' flag is properly set

3. **JSON Import Issues**:
   - ESM-style JSON imports causing errors
   - Solution: Use dynamic imports or adjust module settings

4. **Component Props Issues**:
   - React component prop types aren't correctly defined
   - Solution: Use consistent React.FC pattern with proper children typing

## Implementation Phases

### Phase 1: Core Infrastructure (Completed)
- ✅ Create missing types directory
- ✅ Add LogOption and SerializedMessage interfaces
- ✅ Fix JSON import in macros.ts
- ✅ Update React imports to use namespace syntax

### Phase 2: React Component Type Fixes
- Update components to use consistent React.FC<Props> pattern
- Use correct typing for children props (React.ReactNode)
- Remove 'key' from Props interfaces (it's a special React prop)
- Add explicit return types where missing

### Phase 3: Module System Alignment
- Ensure all import/export statements follow ESM patterns
- Fix any circular dependencies
- Standardize on module resolution approach

### Phase 4: Final Cleanup and Testing
- Run full build with fixed types
- Address any remaining edge cases
- Verify no regressions in functionality

## Detailed Component Fixes

For each component, we'll follow this pattern:
1. Define a proper Props interface with optional children
2. Use React.FC<Props> pattern consistently
3. Add React.ReactNode typing for children
4. Use namespace imports with `import * as React from 'react'`

## Testing Approach

We'll use the analyze-typescript.js script to:
1. Check specific files with project settings
2. Track progress on reducing error count
3. Focus on one category of issues at a time
