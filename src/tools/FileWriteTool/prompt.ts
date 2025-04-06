export const PROMPT = `Write a file to the local filesystem. Overwrites the existing file if there is one.

Before using this tool:

1. Use the ReadFile tool to understand the file's contents and context
2. Directory Verification (only applicable when creating new files):
   - Use the LS tool to verify the parent directory exists and is the correct location
3. Avoid rewriting a whole file if you are making edits. Use the EditFileTool instead for more efficiency.`

export const DESCRIPTION = 'Write a file to the local filesystem.'
