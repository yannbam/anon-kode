import { Box, Text } from 'ink'
import * as React from 'react'
import { getTheme } from '../utils/theme'
import { ASCII_LOGO } from '../constants/product'

export function AsciiLogo(): React.ReactNode {
  const theme = getTheme()
  return (
    <Box flexDirection="column" alignItems="flex-start">
      <Text color={theme.claude}>
        {ASCII_LOGO}
      </Text>
    </Box>
  )
}