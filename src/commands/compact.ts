import { Command } from '../commands'
import { getContext } from '../context'
import { getMessagesGetter, getMessagesSetter } from '../messages'
import { API_ERROR_MESSAGE_PREFIX, querySonnet } from '../services/claude'
import {
  createUserMessage,
  normalizeMessagesForAPI,
} from '../utils/messages.js'
import { getCodeStyle } from '../utils/style'
import { clearTerminal } from '../utils/terminal'
import { sessionLogger } from '../utils/sessionLogger.js'
import { getGlobalConfig } from '../utils/config.js'

const compact = {
  type: 'local',
  name: 'compact',
  description: 'Clear conversation history but keep a summary in context',
  isEnabled: true,
  isHidden: false,
  async call(
    _,
    {
      options: { tools, slowAndCapableModel },
      abortController,
      setForkConvoWithMessagesOnTheNextRender,
    },
  ) {
    // Get existing messages before clearing
    const messages = getMessagesGetter()()

    // Add summary request as a new message
    const summaryRequest = createUserMessage(
      "Provide a detailed but concise summary of our conversation above. Focus on information that would be helpful for continuing the conversation, including what we did, what we're doing, which files we're working on, and what we're going to do next.",
    )

    const summaryResponse = await querySonnet(
      normalizeMessagesForAPI([...messages, summaryRequest]),
      ['You are a helpful AI assistant tasked with summarizing conversations.'],
      0,
      tools,
      abortController.signal,
      {
        dangerouslySkipPermissions: false,
        model: slowAndCapableModel,
        prependCLISysprompt: true,
      },
    )

    // Extract summary from response, throw if we can't get it
    const content = summaryResponse.message.content
    const summary =
      typeof content === 'string'
        ? content
        : content.length > 0 && content[0]?.type === 'text'
          ? content[0].text
          : null

    if (!summary) {
      throw new Error(
        `Failed to generate conversation summary - response did not contain valid text content - ${summaryResponse}`,
      )
    } else if (summary.startsWith(API_ERROR_MESSAGE_PREFIX)) {
      throw new Error(summary)
    }

    // Substitute low token usage info so that the context-size UI warning goes
    // away. The actual numbers don't matter too much: `countTokens` checks the
    // most recent assistant message for usage numbers, so this estimate will
    // be overridden quickly.
    summaryResponse.message.usage = {
      input_tokens: 0,
      output_tokens: summaryResponse.message.usage.output_tokens,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    }

    // Import session logger here to avoid circular dependency - proper ES Module dynamic import
    // Using static imports from the top of the file
    // No dynamic imports needed, circular dependency is resolved properly
    
    // Clear screen and messages
    await clearTerminal()
    getMessagesSetter()([])
    setForkConvoWithMessagesOnTheNextRender([
      createUserMessage(
        `Use the /compact command to clear the conversation history, and start a new conversation with the summary in context.`,
      ),
      summaryResponse,
    ])
    getContext.cache.clear?.()
    getCodeStyle.cache.clear?.()
    
    // Log the compact command with the summary
    if (getGlobalConfig().enableSessionLogging) {
      sessionLogger.logContextChange('compact', summary);
    }

    return '' // not used, just for typesafety. TODO: avoid this hack
  },
  userFacingName() {
    return 'compact'
  },
} satisfies Command

export default compact
