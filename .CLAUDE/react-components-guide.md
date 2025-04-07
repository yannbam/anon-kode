# React & TypeScript Development Guide

## Common React-TypeScript Patterns

### Component Props with Children
```typescript
interface Props {
  children?: React.ReactNode;  // Make children optional with ?
}

const Component: React.FC<Props> = ({ children }) => {
  return <div>{children}</div>;
};
```

### Event Handlers
```typescript
interface ButtonProps {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}
```

### Forwarding Props
```typescript
// Extend JSX intrinsic elements
interface ButtonProps extends JSX.IntrinsicElements['button'] {
  label: string;
}
```

### Refs
```typescript
const inputRef = useRef<HTMLInputElement>(null);
```

## React Key Handling

### Key Prop Handling
- The `key` prop is a special prop in React used for list rendering
- It should not be included in component Props interfaces
- For components rendered in a list, always provide a unique key

```typescript
// WRONG: Don't include key in Props interface
interface Props {
  name: string;
  key: string; // ❌ Wrong approach - 'key' is a special React prop
}

// CORRECT: Use key when rendering components in a list
{items.map((item, index) => (
  <Component 
    key={`item-${index}`} // ✅ Correct usage of key prop
    name={item.name} 
  />
))}
```

### Key with React.createElement
```typescript
// When using React.createElement, key is the third argument
React.createElement(Component, { name: item.name }, `item-${index}`);
```

## Terminal UI (Ink) Specific Patterns

### Text Rendering
In Ink (terminal UI framework), all text must be wrapped in `<Text>` components:

```typescript
// WRONG - will cause runtime error
return <Box>This is plain text</Box>;

// CORRECT
return <Box><Text>This is properly wrapped text</Text></Box>;
```

### Styling
```typescript
// Use Ink's style props
<Text bold color="green">Styled text</Text>

// Use Box for layout
<Box flexDirection="column" padding={1}>
  <Text>Content</Text>
</Box>
```

## Lessons from ESM Migration

### Key React Component Fixes

1. **Wrong Approach to Children Props**
   - Initial problem: Missing 'children' properties required by Props types
   - Solution: Made children optional in component interfaces

2. **List Rendering Key Issues**
   - Problem: "Each child in a list should have a unique 'key' prop" warning
   - Solution: Added unique key props to all React elements

3. **Ink Text Rendering Error**
   - Problem: "Text string must be rendered inside `<Text>` component"
   - Solution: Ensured all text was properly wrapped in Ink's `<Text>` components

4. **React Component Interfaces**
   - Use interface instead of type for component props
   - Make children optional with `?` where appropriate
   - Use explicit React namespace imports: `import * as React from 'react'`

## Useful Resources

### Official React TypeScript Cheatsheet
- Repository: https://github.com/typescript-cheatsheets/react
- Comprehensive collection of tips and best practices

### Other Helpful Resources
- Concise Cheatsheet: https://dev.to/bendman/react-typescript-cheatsheet-1f2h
- Simple & Opinionated: https://github.com/ibnumusyaffa/simple-react-typescript-cheatsheet

These resources are invaluable for fixing TypeScript errors in React components and should be consulted when working with TypeScript and React.