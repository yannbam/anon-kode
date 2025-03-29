import { z } from 'zod'
import { ReactNode } from 'react'

export type ValidationResult = { result: boolean; message?: string }

export interface ToolUseContext {
  abortController: AbortController
  messageId: string
  readFileTimestamps: Record<string, number>
}

export type SetToolJSXFn = (jsx: ReactNode) => void

export interface Tool<In extends z.ZodObject<any> = any, Out = void> {
  name: string
  userFacingName: (input: z.infer<In>) => string
  description: string | ((input: z.infer<In>) => Promise<string>)
  isEnabled: () => Promise<boolean>
  isReadOnly: () => boolean
  needsPermissions?: () => boolean
  inputSchema: In
  inputJSONSchema?: Record<string, unknown>
  validateInput?: (input: z.infer<In>) => Promise<ValidationResult>
  call: (input: z.infer<In>, context: ToolUseContext) => AsyncGenerator<
    | { type: 'update'; jsx: ReactNode }
    | { type: 'result'; resultForAssistant: string; data: Out },
    void,
    unknown
  >
  prompt: (options: { dangerouslySkipPermissions: boolean }) => Promise<string>
  renderToolUseMessage: (input: z.infer<In>, options: { verbose: boolean }) => ReactNode
  renderToolUseRejectedMessage: () => ReactNode
  renderToolResultMessage?: (content: Out, options: { verbose: boolean }) => ReactNode
  renderResultForAssistant?: (data: Out) => string
} 