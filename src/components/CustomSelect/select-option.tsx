import figures from 'figures';
import { Box, Text } from 'ink';
import * as React from 'react';
import { useComponentTheme } from '@inkjs/ui';

// Define Theme type since we couldn't find the original file
interface Theme {
  Select?: any; // Using any as fallback since we don't have the exact type
}

export type SelectOptionProps = {
  /**
   * Determines if option is focused.
   */
  readonly isFocused: boolean;

  /**
   * Determines if option is selected.
   */
  readonly isSelected: boolean;

  /**
   * Determines if pointer is shown when selected
   */
  readonly smallPointer?: boolean;

  /**
   * Option label.
   */
  readonly children: React.ReactNode;
};

export const SelectOption: React.FC<SelectOptionProps> = ({
  isFocused,
  isSelected,
  smallPointer,
  children,
}) => {
  const { styles } = useComponentTheme<Theme>('Select');

  return (
    <Box {...styles.option({ isFocused })}>
      {isFocused && (
        <Text {...styles.focusIndicator()}>
          {smallPointer ? figures.triangleDownSmall : figures.pointer}
        </Text>
      )}

      <Text {...styles.label({ isFocused, isSelected })}>{children}</Text>

      {isSelected && (
        <Text {...styles.selectedIndicator()}>{figures.tick}</Text>
      )}
    </Box>
  );
};
