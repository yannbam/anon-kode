# TypeScript Errors Categorized

## 1. React Component Props Errors (~40%)
- Missing 'children' properties required by Props types
- Invalid 'key' property on various component props
- Incompatible prop types
- Example: `error TS2741: Property 'children' is missing in type '{}' but required in type 'Props'`

## 2. Missing Exports/Imports (~20%)
- Missing 'ToolUseContext' export from Tool
- Missing 'ValidationResult' export
- Missing 'SetToolJSXFn' export
- Cannot find modules like '../types/logs'
- Example: `error TS2305: Module '"./Tool"' has no exported member 'ToolUseContext'`

## 3. Type Incompatibilities (~15%)
- Generic vs non-generic Tool issues
- Incompatible function types
- Example: `error TS2315: Type 'Tool' is not generic`

## 4. Missing Namespaces (~10%)
- Cannot find namespace 'React'
- Cannot find namespace 'JSX'
- Example: `error TS2503: Cannot find namespace 'React'`

## 5. Missing Properties (~10%)
- Properties like 'userFacingName', 'isReadOnly' not existing on Tool type
- Properties missing from library types
- Example: `error TS2339: Property 'userFacingName' does not exist on type 'Tool'`

## 6. Other Miscellaneous Errors (~5%)
- Path issues (.tsx extension not allowed)
- Unknown properties in objects
- Type mismatch between string and function

## Observations
1. Most errors are related to React component typing
2. Many errors stem from Tool interface definition issues
3. Some errors are from dependencies (sharp, etc.)
4. The bundler moduleResolution helps with imports but doesn't fix type errors

These errors are suppressed by our build-temp.js script, allowing the build to complete despite the type errors. This approach is working for development but should be cleaned up eventually for production.