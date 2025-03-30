import * as React from 'react'
import { existsSync, readFileSync } from 'fs'
import { useMemo } from 'react'
import { StructuredDiff } from '../../StructuredDiff'
import { Box, Text } from 'ink'
import { getTheme } from '../../../utils/theme'
import { intersperse } from '../../../utils/array'
import { getCwd } from '../../../utils/state'
import { relative } from 'path'
import { getPatch } from '../../../utils/diff'

type Props = {
  file_path: string
  new_string: string
  old_string: string
  verbose: boolean
  useBorder?: boolean
  width: number
}

export function FileEditToolDiff({
  file_path,
  new_string,
  old_string,
  verbose,
  useBorder = true,
  width,
}: Props): React.ReactNode {
  const file = useMemo(
    () => (existsSync(file_path) ? readFileSync(file_path, 'utf8') : ''),
    [file_path],
  )
  const patch = useMemo(
    () =>
      getPatch({
        filePath: file_path,
        fileContents: file,
        oldStr: old_string,
        newStr: new_string,
      }),
    [file_path, file, old_string, new_string],
  )

  return (
    <Box flexDirection="column">
      <Box
        borderColor={getTheme().secondaryBorder}
        borderStyle={useBorder ? 'round' : undefined}
        flexDirection="column"
        paddingX={1}
      >
        <Box paddingBottom={1}>
          <Text bold>
            {verbose ? file_path : relative(getCwd(), file_path)}
          </Text>
        </Box>
        {intersperse(
          patch.map(_ => 
            // Use React.createElement to avoid key prop type issues
            React.createElement(StructuredDiff, {
              patch: _,
              dim: false,
              width: width
            }, _.newStart)
          ),
          i => 
            // Use React.createElement for Text component
            React.createElement(Text, {
              color: getTheme().secondaryText,
              children: '...'
            }, `ellipsis-${i}`)
        )}
      </Box>
    </Box>
  )
}
