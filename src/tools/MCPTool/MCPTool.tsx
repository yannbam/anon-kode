import { Box, Text } from 'ink'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '../../components/FallbackToolUseRejectedMessage'
import { type Tool } from '../../Tool'
import { getTheme } from '../../utils/theme'
import { DESCRIPTION, PROMPT } from './prompt'
import { OutputLine } from '../BashTool/OutputLine'

// Allow any input object since MCP tools define their own schemas
const inputSchema = z.object({}).passthrough()

export const MCPTool = {
  async isEnabled() {
    return true
  },
  isReadOnly() {
    return false
  },
  // Overridden in mcpClient.ts
  name: 'mcp',
  // Overridden in mcpClient.ts
  async description() {
    return DESCRIPTION
  },
  // Overridden in mcpClient.ts
  async prompt() {
    return PROMPT
  },
  inputSchema,
  // Overridden in mcpClient.ts
  async *call() {
    yield {
      type: 'result',
      data: '',
      resultForAssistant: '',
    }
  },
  needsPermissions() {
    return true
  },
  renderToolUseMessage(input) {
    return Object.entries(input)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ')
  },
  // Overridden in mcpClient.ts
  userFacingName: () => 'mcp',
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  renderToolResultMessage(output, { verbose }) {
    if (Array.isArray(output)) {
      return (
        <Box flexDirection="column">
          {output.map((item, i) => {
            if (item.type === 'image') {
              return (
                <Box
                  key={i}
                  justifyContent="space-between"
                  overflowX="hidden"
                  width="100%"
                >
                  <Box flexDirection="row">
                    <Text>&nbsp;&nbsp;⎿ &nbsp;</Text>
                    <Text>[Image]</Text>
                  </Box>
                </Box>
              )
            }
            const lines = item.text.split('\n').length
            return React.createElement(OutputLine, {
              content: item.text,
              lines: lines,
              verbose: verbose
            }, i)
          })}
        </Box>
      )
    }

    if (!output) {
      return (
        <Box justifyContent="space-between" overflowX="hidden" width="100%">
          <Box flexDirection="row">
            <Text>&nbsp;&nbsp;⎿ &nbsp;</Text>
            <Text color={getTheme().secondaryText}>(No content)</Text>
          </Box>
        </Box>
      )
    }

    const lines = output.split('\n').length
    return <OutputLine content={output} lines={lines} verbose={verbose} />
  },
  renderResultForAssistant(content) {
    return content
  },
} satisfies Tool<typeof inputSchema, string>
