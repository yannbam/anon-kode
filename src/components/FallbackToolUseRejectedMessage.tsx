import * as React from 'react';
import { Text } from 'ink';
import { getTheme } from '../utils/theme';
import { PRODUCT_NAME } from '../constants/product';

interface FallbackToolUseRejectedMessageProps {
  // No required props
}

export const FallbackToolUseRejectedMessage: React.FC<FallbackToolUseRejectedMessageProps> = () => {
  return (
    <Text>
      &nbsp;&nbsp;⎿ &nbsp;
      <Text color={getTheme().error}>
        No (tell {PRODUCT_NAME} what to do differently)
      </Text>
    </Text>
  );
};
