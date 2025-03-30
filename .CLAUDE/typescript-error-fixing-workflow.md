# Effective TypeScript Error Fixing Workflow for Claude Instances

This guide outlines a structured approach for fixing TypeScript errors in a codebase, with a focus on ESM migration issues. Following these principles will help maintain consistency, avoid lost work, and make steady progress through complex type errors.

## 1. Research First Approach

Before making any changes:
- Use `web-search` to research TypeScript issues and best practices specific to the framework or library involved
- Look for established patterns and solutions rather than inventing your own
- Understand the root cause of the error, not just how to make it disappear

```typescript
// Example: When fixing React component props issues
// Search for "typescript react component props type patterns" first

// DON'T immediately try random fixes:
interface Props {
  // Adding untested properties randomly
  key?: string; // ❌ Wrong approach
}

// DO search for established patterns and best practices:
// Use React.createElement with key as third argument ✅
const element = React.createElement(Component, { normalProp: value }, uniqueKey);
```

## 2. Focused, Single-Issue Fixes

- Work on one type of error or one file at a time
- Make the smallest change needed to fix the issue
- Don't try to refactor or improve code beyond fixing the specific error
- Prioritize errors that unlock solutions to other errors

```typescript
// Example: Fix only the specific error
// Original with error: Property 'ISSUES_EXPLAINER' does not exist
export const MACRO = {
  VERSION: "1.0.0",
  PACKAGE_URL: "https://example.com"
};

// DO make minimal focused fix:
export const MACRO = {
  VERSION: "1.0.0",
  PACKAGE_URL: "https://example.com",
  ISSUES_EXPLAINER: "relevant value here" // ✅ Just add the missing property
};

// DON'T refactor the whole object:
export const MACRO = { // ❌ Unnecessary refactoring beyond the error
  get VERSION() { return process.env.VERSION || "1.0.0" },
  URLS: {
    PACKAGE: "https://example.com",
    ISSUES: "https://issues.example.com"
  },
  ISSUES_EXPLAINER: "relevant value here"
};
```

## 3. Error Filtering Techniques

To manage large numbers of TypeScript errors effectively:

- Filter errors by category or pattern using grep
- Focus on one error type at a time
- Once fixed, filter that error out to reveal the next set
- Use counts to track progress

```bash
# Get total error count
node build-temp-test.js | grep -E "error TS[0-9]+" | wc -l

# Filter for specific error types
node build-temp-test.js | grep -E "error TS[0-9]+" | grep "Property '.*' does not exist"

# Filter for errors in specific files
node build-temp-test.js | grep -E "error TS[0-9]+" | grep "FileName.tsx"

# Sort errors to identify patterns
node build-temp-test.js | grep -E "error TS[0-9]+" | sort | uniq -c | sort -nr
```

## 4. Immediate Testing

After each change, test immediately:

- Test the specific file you modified
- Verify the error is fixed
- Check that no new errors were introduced
- Run complete build periodically to confirm overall progress

```bash
# Test a specific file
npx tsc --noEmit src/path/to/fixed/file.tsx

# Check if specific error is gone
node build-temp-test.js | grep -E "error TS[0-9]+" | grep "specific error message"

# Compare error counts before and after
node build-temp-test.js | grep -E "error TS[0-9]+" | wc -l
```

## 5. Atomic Commits

- Make a separate commit for each logical fix
- Include descriptive commit messages explaining:
  - What was fixed
  - How it was fixed
  - Why this approach was chosen
  - What errors it resolves

```
Fix key prop issues in StructuredDiff component

- Used React.createElement instead of JSX to handle key props correctly
- Avoided 'key' being passed as a prop to components
- Passed key as third argument to createElement to set it as a special React property
- Fixed all 'Property key does not exist on type Props' errors
```

## 6. Managed Turn Size

The optimal turn size is:
- **5-7 tool calls per turn** (maximum 10)
- **1-3 related fixes** per turn
- End turn after each logical unit of work is completed

Keep turns reasonably sized to:
- Avoid connection timeouts
- Prevent losing work in progress
- Allow for human feedback on your approach
- Maintain a clear working history

End your turn with `ask_human_tool` after making progress, providing:
- A clear summary of what was accomplished
- Metrics of errors fixed
- Request for guidance on what to tackle next

## 7. Progress Tracking

- Track error counts before and after changes
- Group errors into categories (e.g., "key prop issues", "missing properties")
- Prioritize high-impact fixes that address multiple errors
- Document progress in commit messages

```
Starting error count: 72
After fixing React component props: 59
After fixing missing properties: 52
Remaining issues categorized as:
- Service implementation mismatches (10)
- Missing namespace imports (8)
- etc.
```

## Common TypeScript Error Categories and Solutions

### 1. React Component Prop Issues
```typescript
// Problem: key prop being passed directly
<Component key="value" /> // Causes: Property 'key' does not exist on type 'Props'

// Solution: Use React.createElement
React.createElement(Component, props, "value") // Pass key as third argument
```

### 2. Missing Properties
```typescript
// Problem: Missing property
obj.missingProperty // Causes: Property 'missingProperty' does not exist on type

// Solution: Add property to interface/type
interface MyInterface {
  existingProp: string;
  missingProperty: string; // Add the missing property
}
```

### 3. Import/Module Issues
```typescript
// Problem: Cannot find module
import { Something } from './missing'

// Solution: Create missing module or fix path
// Create the module or use proper path
```

### 4. Function Signature Mismatches
```typescript
// Problem: Argument count mismatch
function example(a: string, b: number) {}
example("test", 1, true) // Too many arguments

// Solution: Update function signature or call site
function example(a: string, b: number, c?: boolean) {}
```

## Key Principles

1. **Understand before modifying**: Research types thoroughly before changing code
2. **Make minimal changes**: Don't refactor or improve beyond fixing the error
3. **Filter and focus**: Work on one error category at a time
4. **Maintain consistency**: Follow existing patterns in the codebase
5. **Test every change**: Verify immediately that each fix works
6. **Document clearly**: Make descriptive commits explaining what and why
7. **Stay organized**: Fix errors by category or file, not randomly
8. **Manage turn size**: Keep to 5-7 tool calls per turn
9. **Track progress**: Count errors before and after changes
10. **Communicate effectively**: Summarize work and seek guidance regularly

Following this structured approach will lead to more effective and efficient TypeScript error fixing sessions with fewer connection issues or lost work.
