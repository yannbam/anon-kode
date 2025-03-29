import { z } from 'zod'
import * as React from 'react'

// Define the SetToolJSXFn type that's imported in various files
export type SetToolJSXFn = (jsx: React.ReactNode) => void

// Define the ToolUseContext interface based on how it's used in the codebase
export interface ToolUseContext {
  abortController: AbortController
  messageId?: string
  readFileTimestamps?: Record<string, number>
  setToolJSX?: SetToolJSXFn
  options: {
    dangerouslySkipPermissions?: boolean
    forkNumber?: number
    messageLogName?: string
    tools: Tool[]
    commands?: any[]
    verbose?: boolean
    slowAndCapableModel?: string
    maxThinkingTokens?: number
  }
}

export interface ValidationResult {
  result: boolean
  message?: string
  meta?: Record<string, any>
}

// The core Tool interface with all properties found in implementations
export interface Tool<In extends z.ZodObject<any> = z.ZodObject<any>, Out = any> {
  // Original required properties
  name: string
  inputSchema: In
  prompt: (options: { dangerouslySkipPermissions: boolean }) => Promise<string>
  
  // Original optional properties
  description?: string | ((input: z.infer<In>) => Promise<string>)
  inputJSONSchema?: Record<string, unknown>
  
  // Additional properties found in tool implementations
  userFacingName?: (input: z.infer<In>) => string
  isEnabled?: () => Promise<boolean>
  isReadOnly?: () => boolean
  needsPermissions?: (input: z.infer<In>) => boolean
  validateInput?: (input: z.infer<In>, context?: ToolUseContext) => Promise<ValidationResult>
  
  // The call method used to execute the tool
  call: (input: z.infer<In>, context: ToolUseContext, canUseTool?: any) => AsyncGenerator<
    | { type: 'result'; resultForAssistant: any; data: Out }
    | { type: 'progress'; content: any; normalizedMessages: any[]; tools: Tool[] },
    void
  >
  
  // Render methods for UI components
  renderToolUseMessage?: (input: z.infer<In>, options?: { verbose?: boolean }) => React.ReactNode | string
  renderToolUseRejectedMessage?: (
    input?: any, // Some tools pass parameters like { file_path, content } or { file_path, old_string, new_string }
    options?: { columns?: any; verbose?: boolean }
  ) => React.ReactNode
  renderToolResultMessage?: (content: Out, options?: { verbose?: boolean }) => React.ReactNode
  renderResultForAssistant?: (data: Out) => any
}
