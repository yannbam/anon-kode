# TypeScript Error Fixing Instructions

## Background
The anon-kode project has been updated to use proper module resolution with a bundler approach. The build process now uses TypeScript with ESM support, but there are many type errors that are currently suppressed to allow the build to complete. Your task is to systematically fix these errors.

## Current Setup
- Project uses a hybrid approach with TypeScript using `moduleResolution: "bundler"` and `module: "ES2022"`
- Has `"type": "module"` in package.json for ESM support where needed
- A custom build script (build-temp.js) allows build to complete despite type errors
- The bundler module resolution exposes type errors that were previously overlooked
- The project is structured as a React application using Ink for terminal UI

## Step 1: Fix Tool Interface Issues
Many errors stem from an incomplete Tool interface. Start by updating the Tool.ts file:
1. Add missing properties and methods: `userFacingName`, `isReadOnly`, `isEnabled`, `validateInput`, `call`, etc.
2. Export missing types: `ToolUseContext`, `ValidationResult`, `SetToolJSXFn`
3. Make Tool generic where needed or fix types that incorrectly use Tool as generic

## Step 2: Fix React Component Prop Types
Many components have prop type issues:
1. Fix components that are missing required `children` prop
2. Address components with `key` prop issues - React keys should not be part of component prop types
3. Make sure component Props interfaces are correctly defined with optional vs required props

## Step 3: Create Missing Type Definitions
Several imports refer to non-existent type files:
1. Create or fix `../types/logs` module
2. Create or fix `../types/notebook` module
3. Fix imports for theme files in CustomSelect components

## Step 4: Fix React Namespace Issues
Some files have issues accessing React namespaces:
1. Add proper React imports where React namespace is missing
2. Fix JSX namespace issues with proper imports

## Step 5: Address Miscellaneous Errors
1. Fix the `.tsx` extension import issue in Doctor.tsx
2. Fix function argument count mismatches in openai.ts
3. Fix incorrect property access from unknown types using type guards

## Testing Strategy
1. Fix errors in related groups
2. Run the build after each group to verify reduction in errors
3. Test the actual runtime functionality to ensure changes don't break behavior

## Deliverables
1. Fixed TypeScript code with minimal type errors
2. Documentation of any types that had to be added or significantly modified
3. A list of any unresolved errors with reasons and suggested future fixes

Remember to preserve the existing behavior of the code - we're only fixing type issues, not implementing new features or changing functionality.