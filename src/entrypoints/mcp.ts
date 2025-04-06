import { McpServer as Server } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ZodSchema } from 'zod'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  CallToolResultSchema,
  ListToolsRequestSchema,
  ListToolsResultSchema,
  ToolSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { AgentTool } from '../tools/AgentTool/AgentTool'
import { hasPermissionsToUseTool } from '../permissions'
import { setCwd } from '../utils/state'
import { getSlowAndCapableModel } from '../utils/model'
import { logError } from '../utils/log'
import { LSTool } from '../tools/lsTool/lsTool'
import { BashTool } from '../tools/BashTool/BashTool'
import { FileEditTool } from '../tools/FileEditTool/FileEditTool'
import { FileReadTool } from '../tools/FileReadTool/FileReadTool'
import { GlobTool } from '../tools/GlobTool/GlobTool'
import { GrepTool } from '../tools/GrepTool/GrepTool'
import { FileWriteTool } from '../tools/FileWriteTool/FileWriteTool'
import { Tool } from '../Tool'
import { Command } from '../commands'
import review from '../commands/review'
import { lastX } from '../utils/generators'
import { MACRO } from '../constants/macros'
type ToolInput = z.infer<typeof ToolSchema.shape.inputSchema>

const state: {
  readFileTimestamps: Record<string, number>
} = {
  readFileTimestamps: {},
}

const MCP_COMMANDS: Command[] = [review]

const MCP_TOOLS: Tool[] = [
  AgentTool,
  BashTool,
  FileEditTool,
  FileReadTool,
  GlobTool,
  GrepTool,
  FileWriteTool,
  LSTool,
]

// Extend the McpServer type with the missing methods
interface ExtendedMcpServer {
  setRequestHandler<T extends ZodSchema, U extends ZodSchema>(requestSchema: T, handler: (request: { params: any; method: string }) => Promise<z.infer<U>>): void;
  connect(transport: any): Promise<void>;
}

export async function startMCPServer(cwd: string): Promise<void> {
  await setCwd(cwd)
  const server = new Server(
    {
      name: 'claude/tengu',
      version: MACRO.VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  ) as Server & ExtendedMcpServer

  server.setRequestHandler(
    ListToolsRequestSchema,
    async (): Promise<z.infer<typeof ListToolsResultSchema>> => {
      const tools = await Promise.all(
        MCP_TOOLS.map(async tool => ({
          ...tool,
          description: typeof tool.description === 'function' 
            ? await tool.description(z.object({}))
            : tool.description || '',
          inputSchema: zodToJsonSchema(tool.inputSchema) as ToolInput,
        })),
      )

      return {
        tools,
      }
    },
  )

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request): Promise<z.infer<typeof CallToolResultSchema>> => {
      // Cast request.params to the expected shape
      const { name, arguments: args } = request.params as { name: string; arguments?: Record<string, unknown> }
      const tool = MCP_TOOLS.find(_ => _.name === name)
      if (!tool) {
        throw new Error(`Tool ${name} not found`)
      }

      // TODO: validate input types with zod
      try {
        if (!(await tool.isEnabled())) {
          throw new Error(`Tool ${name} is not enabled`)
        }
        const model = await getSlowAndCapableModel()
        const validationResult = await tool.validateInput?.(
          (args as never) ?? {},
          {
            abortController: new AbortController(),
            options: {
              commands: MCP_COMMANDS,
              tools: MCP_TOOLS,
              slowAndCapableModel: model,
              forkNumber: 0,
              messageLogName: 'unused',
              maxThinkingTokens: 0,
            },
            messageId: undefined,
            readFileTimestamps: state.readFileTimestamps,
          },
        )
        if (validationResult && !validationResult.result) {
          throw new Error(
            `Tool ${name} input is invalid: ${validationResult.message}`,
          )
        }
        const result = tool.call(
          (args ?? {}) as never,
          {
            abortController: new AbortController(),
            messageId: undefined,
            options: {
              commands: MCP_COMMANDS,
              tools: MCP_TOOLS,
              slowAndCapableModel: await getSlowAndCapableModel(),
              forkNumber: 0,
              messageLogName: 'unused',
              maxThinkingTokens: 0,
            },
            readFileTimestamps: state.readFileTimestamps,
          },
          hasPermissionsToUseTool,
        )

        const finalResult = await lastX(result)

        if (finalResult.type !== 'result') {
          throw new Error(`Tool ${name} did not return a result`)
        }

        return {
          content: Array.isArray(finalResult)
            ? finalResult.map(item => ({
                type: 'text' as const,
                text: 'text' in item ? item.text : JSON.stringify(item),
              }))
            : [
                {
                  type: 'text' as const,
                  text:
                    typeof finalResult === 'string'
                      ? finalResult
                      : JSON.stringify(finalResult.data),
                },
              ],
        }
      } catch (error) {
        logError(error)
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        }
      }
    },
  )

  async function runServer() {
    const transport = new StdioServerTransport()
    await server.connect(transport)
  }

  return await runServer()
}
