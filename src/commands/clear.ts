import { Command } from '../commands'
import { getMessagesSetter } from '../messages'
import { getContext } from '../context'
import { getCodeStyle } from '../utils/style'
import { clearTerminal } from '../utils/terminal'
import { getOriginalCwd, setCwd } from '../utils/state'
import { Message } from '../query'
import { sessionLogger } from '../utils/sessionLogger.js'
import { getGlobalConfig } from '../utils/config.js'

export async function clearConversation(context: {
  setForkConvoWithMessagesOnTheNextRender: (
    forkConvoWithMessages: Message[],
  ) => void
}) {
  // Using static imports from the top of the file
  // No dynamic imports needed, circular dependency is resolved properly
  
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
