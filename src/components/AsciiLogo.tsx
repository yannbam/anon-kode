import * as React from 'react';
import { Box, Text } from 'ink';
import { getTheme } from '../utils/theme';
import { ASCII_LOGO } from '../constants/product';

interface AsciiLogoProps {
  // No required props
}

export const AsciiLogo: React.FC<AsciiLogoProps> = () => {
  const theme = getTheme();
  return (
    <Box flexDirection="column" alignItems="flex-start">
      <Text color={theme.claude}>
        {ASCII_LOGO}
      </Text>
    </Box>
  );
};