import * as React from 'react';
import { Box, Text } from 'ink';
import figures from 'figures';
import { useComponentTheme } from '@inkjs/ui';
import type { ComponentTheme } from '@inkjs/ui/build/theme';

interface SelectOptionProps {
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
}

export const SelectOption: React.FC<SelectOptionProps> = ({
  isFocused,
  isSelected,
  smallPointer,
  children,
}) => {
  const { styles } = useComponentTheme<ComponentTheme>('Select');

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
