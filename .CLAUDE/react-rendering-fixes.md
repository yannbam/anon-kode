# React Rendering Fixes for ESM Migration

## Overview

During ESM migration verification, we discovered two React-specific runtime errors that weren't caught by TypeScript's type checking. These kinds of issues are common when migrating projects that use React, as they only manifest during runtime rendering.

## Fixed Issues

### 1. Missing Key Props in List Rendering

**Problem:**
- Warning: "Each child in a list should have a unique 'key' prop"
- Appeared when running `/cost` command
- Affected files: `src/components/Message.tsx`

**Solution:**
- Added unique key props to all React elements created manually with `React.createElement()`
- Used descriptive key patterns like `assistant-message-${index}` and `user-message-${index}`
- This helps React efficiently track and update components in lists

**Code Change:**
```typescript
// Changed from:
React.createElement(AssistantMessage, {
  // props...
}, null);

// To:
React.createElement(AssistantMessage, {
  // props...
}, `assistant-message-${index}`);
```

### 2. Ink Text Rendering Error

**Problem:**
- Error: "Text string must be rendered inside `<Text>` component"
- Appeared when running `/cost` command 
- Affected file: `src/components/messages/AssistantLocalCommandOutputMessage.tsx`
- Specific to Ink library which requires text to be wrapped in `<Text>` components

**Solution:**
- Added unique key props to all React elements
- Ensured all text was properly wrapped in Ink's `<Text>` components
- Fixed hardcoded string keys like `"0"` to descriptive keys like `"command-output-box"`

**Code Change:**
```typescript
// Changed from:
React.createElement(Box, { 
  // props... 
}, "0")

// To:
React.createElement(Box, { 
  // props... 
}, "command-output-box")
```

## Lessons Learned

1. **TypeScript Doesn't Catch Runtime Issues**
   - TypeScript's static type checking can't catch React-specific rendering issues
   - Runtime verification is essential even after fixing all TypeScript errors

2. **React Key Props Are Critical**
   - React requires unique keys for elements in lists to optimize rendering
   - Hardcoded keys like "0" can cause conflicts
   - Descriptive, unique keys based on data (like indices or IDs) are best practice

3. **Terminal UI Libraries Have Special Requirements**
   - Ink (the React terminal UI library) requires all text to be wrapped in `<Text>` components
   - This differs from web React where text can be rendered directly in JSX

## Verification Process

These issues were discovered through manual testing, specifically by checking the functionality of specific commands like `/cost`. This highlights the importance of thorough end-to-end testing after a migration rather than relying solely on automated type checking.
