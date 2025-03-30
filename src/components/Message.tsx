import { Box } from 'ink'
import * as React from 'react'
import type { AssistantMessage, Message, UserMessage } from '../query'
import type {
  ContentBlock,
  DocumentBlockParam,
  ImageBlockParam,
  TextBlockParam,
  ThinkingBlockParam,
  ToolResultBlockParam,
  ToolUseBlockParam,
} from '@anthropic-ai/sdk/resources/index.mjs'
import { Tool } from '../Tool'
import { logError } from '../utils/log'
import { UserToolResultMessage } from './messages/UserToolResultMessage/UserToolResultMessage'
import { AssistantToolUseMessage } from './messages/AssistantToolUseMessage'
import { AssistantTextMessage } from './messages/AssistantTextMessage'
import { UserTextMessage } from './messages/UserTextMessage'
import { NormalizedMessage } from '../utils/messages'
import { AssistantThinkingMessage } from './messages/AssistantThinkingMessage'
import { AssistantRedactedThinkingMessage } from './messages/AssistantRedactedThinkingMessage'
import { useTerminalSize } from '../hooks/useTerminalSize'

type Props = {
  message: UserMessage | AssistantMessage
  messages: NormalizedMessage[]
  // TODO: Find a way to remove this, and leave spacing to the consumer
  addMargin: boolean
  tools: Tool[]
  verbose: boolean
  debug: boolean
  erroredToolUseIDs: Set<string>
  inProgressToolUseIDs: Set<string>
  unresolvedToolUseIDs: Set<string>
  shouldAnimate: boolean
  shouldShowDot: boolean
  width?: number | string
}

export function Message({
  message,
  messages,
  addMargin,
  tools,
  verbose,
  debug,
  erroredToolUseIDs,
  inProgressToolUseIDs,
  unresolvedToolUseIDs,
  shouldAnimate,
  shouldShowDot,
  width,
}: Props): React.ReactNode {
  // Assistant message
  if (message.type === 'assistant') {
    return (
      <Box flexDirection="column" width="100%">
        {message.message.content.map((contentItem, index) => {
          // Create element manually with a unique key prop
          return React.createElement(AssistantMessage, {
            key: `assistant-message-${index}`,
            param: contentItem,
            costUSD: message.costUSD,
            durationMs: message.durationMs,
            addMargin: addMargin,
            tools: tools,
            debug: debug,
            options: { verbose },
            erroredToolUseIDs: erroredToolUseIDs,
            inProgressToolUseIDs: inProgressToolUseIDs,
            unresolvedToolUseIDs: unresolvedToolUseIDs,
            shouldAnimate: shouldAnimate,
            shouldShowDot: shouldShowDot,
            width: width
          });
        })}
      </Box>
    )
  }

  // User message
  // TODO: normalize upstream
  const content =
    typeof message.message.content === 'string'
      ? [{ type: 'text', text: message.message.content } as TextBlockParam]
      : message.message.content
  return (
    <Box flexDirection="column" width="100%">
      {content.map((contentItem, index) => {
        // Create element manually with a unique key prop
        return React.createElement(UserMessage, {
          key: `user-message-${index}`,
          message: message,
          messages: messages,
          addMargin: addMargin,
          tools: tools,
          param: contentItem as TextBlockParam,
          options: { verbose }
        });
      })}
    </Box>
  )
}

function UserMessage({
  message,
  messages,
  addMargin,
  tools,
  param,
  options: { verbose },
}: {
  message: UserMessage
  messages: Message[]
  addMargin: boolean
  tools: Tool[]
  param:
    | TextBlockParam
    | DocumentBlockParam
    | ImageBlockParam
    | ToolUseBlockParam
    | ToolResultBlockParam
  options: {
    verbose: boolean
  }
}): React.ReactNode {
  const { columns } = useTerminalSize()
  switch (param.type) {
    case 'text':
      return <UserTextMessage addMargin={addMargin} param={param} />
    case 'tool_result':
      return (
        <UserToolResultMessage
          param={param}
          message={message}
          messages={messages}
          tools={tools}
          verbose={verbose}
          width={columns - 5}
        />
      )
  }
}

function AssistantMessage({
  param,
  costUSD,
  durationMs,
  addMargin,
  tools,
  debug,
  options: { verbose },
  erroredToolUseIDs,
  inProgressToolUseIDs,
  unresolvedToolUseIDs,
  shouldAnimate,
  shouldShowDot,
  width,
}: {
  param:
    | ContentBlock
    | TextBlockParam
    | ImageBlockParam
    | ThinkingBlockParam
    | ToolUseBlockParam
    | ToolResultBlockParam
  costUSD: number
  durationMs: number
  addMargin: boolean
  tools: Tool[]
  debug: boolean
  options: {
    verbose: boolean
  }
  erroredToolUseIDs: Set<string>
  inProgressToolUseIDs: Set<string>
  unresolvedToolUseIDs: Set<string>
  shouldAnimate: boolean
  shouldShowDot: boolean
  width?: number | string
}): React.ReactNode {
  switch (param.type) {
    case 'tool_use':
      return (
        <AssistantToolUseMessage
          param={param}
          costUSD={costUSD}
          durationMs={durationMs}
          addMargin={addMargin}
          tools={tools}
          debug={debug}
          verbose={verbose}
          erroredToolUseIDs={erroredToolUseIDs}
          inProgressToolUseIDs={inProgressToolUseIDs}
          unresolvedToolUseIDs={unresolvedToolUseIDs}
          shouldAnimate={shouldAnimate}
          shouldShowDot={shouldShowDot}
        />
      )
    case 'text':
      return (
        <AssistantTextMessage
          param={param}
          costUSD={costUSD}
          durationMs={durationMs}
          debug={debug}
          addMargin={addMargin}
          shouldShowDot={shouldShowDot}
          verbose={verbose}
          width={width}
        />
      )
    case 'redacted_thinking':
      return <AssistantRedactedThinkingMessage addMargin={addMargin} />
    case 'thinking':
      return <AssistantThinkingMessage addMargin={addMargin} param={param} />
    default:
      logError(`Unable to render message type: ${param.type}`)
      return null
  }
}
