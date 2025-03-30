import * as React from 'react'
import { extractTag } from '../../utils/messages'
import { getTheme } from '../../utils/theme'
import { Box, Text } from 'ink'

export function AssistantLocalCommandOutputMessage({
  content,
}: {
  content: string
}): React.ReactNode[] {
  const stdout = extractTag(content, 'local-command-stdout')
  const stderr = extractTag(content, 'local-command-stderr')
  if (!stdout && !stderr) {
    return []
  }
  const theme = getTheme()
  let insides = [
    format(stdout?.trim(), theme.text),
    format(stderr?.trim(), theme.error),
  ].filter(Boolean)

  if (insides.length === 0) {
    // Use React.createElement to avoid key prop issues
    insides = [React.createElement(Text, { key: "no-output", children: "(No output)" })];
  }

  return [
    React.createElement(Box, { 
      key: "command-output-box",
      gap: 1, 
      children: [
        React.createElement(Box, { 
          key: "prefix-box",
          children: [
            React.createElement(Text, { 
              key: "prefix-text",
              color: theme.secondaryText, 
              children: '  ⎿ ' 
            })
          ] 
        }),
        ...insides.map((element, index) => 
          React.createElement(Box, { 
            key: `command-output-${index}`,
            flexDirection: "column", 
            children: element 
          })
        )
      ]
    })
  ]
}

function format(content: string | undefined, color: string): React.ReactNode {
  if (!content) {
    return null
  }
  return <Text color={color}>{content}</Text>
}
