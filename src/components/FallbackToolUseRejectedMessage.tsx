import * as React from 'react';
import { getTheme } from '../utils/theme';
import { Text } from 'ink';
import { PRODUCT_NAME } from '../constants/product';

type FallbackToolUseRejectedMessageProps = {
  // No required props
};

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
