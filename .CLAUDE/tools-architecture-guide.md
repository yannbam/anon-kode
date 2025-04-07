# Tools Architecture Guide

## Tool Interface Design

### Current Tool Interface Structure

The Tool interface is defined as a generic interface that handles various input and output types:

```typescript
export interface Tool<
  InputType extends z.ZodObject<any> = z.ZodObject<any>,
  OutputType = any
> {
  name: string
  description?: string
  userFacingName: string
  isReadOnly: boolean
  inputSchema: InputType
  inputJSONSchema?: Record<string, unknown>
  prompt: (options: { dangerouslySkipPermissions: boolean }) => Promise<string>
  validateInput: (input: unknown) => ValidationResult<z.infer<InputType>>
  renderToolUse: (input: z.infer<InputType>, setToolJSX: SetToolJSXFn, context: ToolUseContext) => Promise<void>
  renderToolUseRejectedMessage: (
    input: z.infer<InputType>, 
    reason: string, 
    setToolJSX: SetToolJSXFn, 
    context: ToolUseContext
  ) => Promise<void>
  renderSummary: (input: z.infer<InputType>, output: OutputType) => JSX.Element | null
}
```

### Key Components

1. **Generic Type Parameters**
   - `InputType`: Extends ZodObject for input schema validation
   - `OutputType`: The type of output the tool produces (default: any)

2. **Core Properties**
   - `name`: Unique identifier for the tool
   - `userFacingName`: Display name shown to users
   - `isReadOnly`: Whether the tool has read-only access
   - `description`: Optional description of the tool's function
   - `inputSchema`: Zod schema defining valid inputs

3. **Core Methods**
   - `prompt`: Generates a prompt with information about the tool
   - `validateInput`: Validates user input against the schema
   - `renderToolUse`: Renders the tool's UI during use
   - `renderToolUseRejectedMessage`: Handles rejection display
   - `renderSummary`: Shows a summary of tool usage results

### Supporting Types

- **ToolUseContext**: Context object passed to tool rendering methods
- **ValidationResult**: Structure for validation outcome and errors
- **SetToolJSXFn**: Function type for updating tool UI components

## Tool Implementation Pattern

### Base Structure

```typescript
export const ExampleTool: Tool<typeof inputSchema> = {
  name: 'ExampleTool',
  userFacingName: 'Example Tool',
  isReadOnly: true,
  description: 'An example tool that demonstrates the implementation pattern',
  inputSchema,
  
  // Method implementations
  prompt: async ({ dangerouslySkipPermissions }) => { /* ... */ },
  validateInput: (input) => { /* ... */ },
  renderToolUse: async (input, setToolJSX, context) => { /* ... */ },
  renderToolUseRejectedMessage: async (input, reason, setToolJSX, context) => { /* ... */ },
  renderSummary: (input, output) => { /* ... */ }
}
```

### Key Implementation Considerations

1. **Permissions Handling**
   - Tools should check appropriate permissions
   - Use the permission context to request user approval
   - Read-only tools should set `isReadOnly: true`

2. **Error Handling**
   - Validate user input thoroughly
   - Provide clear error messages
   - Handle async failures gracefully

3. **UI Rendering**
   - Use the `setToolJSX` function to update the UI
   - Support both success and error states
   - Keep UI components consistent with the application's style

## Common Tool Types

1. **File System Tools**
   - FileReadTool: Reads file contents
   - FileWriteTool: Writes content to files
   - FileEditTool: Makes specific changes to files
   - GlobTool: Finds files matching patterns
   - GrepTool: Searches file contents

2. **Shell Tools**
   - BashTool: Executes shell commands
   - LSTools: Lists directory contents

3. **Utility Tools**
   - AgentTool: Delegates complex tasks
   - MemoryTools: Manages conversation memory
   - NotebookTools: Handles notebook documents

## ESM Module Considerations

The module system transition to ESM exposed several issues with the Tool interface:

1. **JSON Imports**
   - Use modern ESM syntax for importing JSON:
   ```typescript
   import pkg from '../../package.json' with { type: 'json' }
   ```

2. **Module Resolution**
   - Using `"moduleResolution": "bundler"` in tsconfig
   - Helps manage imports without requiring .js extensions

3. **Build Process**
   - `build-temp-test.js`: Builds despite type errors (temporary)
   - `fix-imports.js`: Fixes ES module imports in compiled JS files

## Best Practices

1. **Interface Consistency**
   - Follow the Tool interface structure precisely
   - Implement all required methods and properties
   - Use generics appropriately for type safety

2. **Permission Model**
   - Always respect the permissions system
   - Use `dangerouslySkipPermissions` only when necessary
   - Provide clear context for permission requests

3. **Error Handling**
   - Validate inputs with Zod schemas
   - Handle edge cases gracefully
   - Provide user-friendly error messages

4. **UI Components**
   - Use Ink for terminal UI rendering
   - Ensure text is wrapped in `<Text>` components
   - Use consistent styling and layout patterns