import { Command } from '../commands'
import { getMessagesSetter } from '../messages'
import { getContext } from '../context'
import { getCodeStyle } from '../utils/style'
import { clearTerminal } from '../utils/terminal'
import { getOriginalCwd, setCwd } from '../utils/state'
import { Message } from '../query'

export async function clearConversation(context: {
  setForkConvoWithMessagesOnTheNextRender: (
    forkConvoWithMessages: Message[],
  ) => void
}) {
  // Import session logger here to avoid circular dependency - proper ES Module dynamic import
  const sessionLoggerModule = await import('../utils/sessionLogger.js');
  const configModule = await import('../utils/config.js');
  const { sessionLogger } = sessionLoggerModule;
  const { getGlobalConfig } = configModule;
  
  await clearTerminal()
  getMessagesSetter()([])
  context.setForkConvoWithMessagesOnTheNextRender([])
  getContext.cache.clear?.()
  getCodeStyle.cache.clear?.()
  await setCwd(getOriginalCwd())
  
  // Log the clear command
  if (getGlobalConfig().enableSessionLogging) {
    sessionLogger.logContextChange('clear');
  }
}

const clear = {
  type: 'local',
  name: 'clear',
  description: 'Clear conversation history and free up context',
  isEnabled: true,
  isHidden: false,
  async call(_, context) {
    clearConversation(context)
    return ''
  },
  userFacingName() {
    return 'clear'
  },
} satisfies Command

export default clear
