# React TypeScript Cheatsheet Resources

## Official React TypeScript Cheatsheet
- **Repository**: https://github.com/typescript-cheatsheets/react
- **Description**: A comprehensive collection of tips and best practices for using TypeScript with React. Maintained by the community with over 38k stars on GitHub.
- **Key Sections**:
  - Basic Cheatsheet - For beginners getting started with TypeScript in React
  - Advanced Cheatsheet - For using generics and more complex types
  - Migrating Cheatsheet - For incrementally migrating JS/Flow codebases to TypeScript
  - HOC Cheatsheet - For higher-order components with TypeScript

## Other Helpful Resources
- **Concise Cheatsheet**: https://dev.to/bendman/react-typescript-cheatsheet-1f2h
  - Shorter reference with common patterns for props, events, styles, refs, etc.

- **Simple & Opinionated**: https://github.com/ibnumusyaffa/simple-react-typescript-cheatsheet
  - Focused on practical examples with a clean approach to typing React components

## Common Patterns from These Resources

### Component Props with Children
```typescript
interface Props {
  children?: React.ReactNode;
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

These resources were instrumental in fixing several TypeScript errors in this codebase and should be consulted for future TypeScript/React work.