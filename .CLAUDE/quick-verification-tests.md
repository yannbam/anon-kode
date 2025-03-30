# Quick Verification Tests for ESM Migration

This document provides a set of quick manual tests to verify that the core functionality is working after the ESM migration.

## Prerequisites

Before running these tests, ensure:
- You've built the project: `pnpm run build`
- You have properly configured API keys for Claude, OpenAI, or other supported models

## Basic Startup Tests

1. **CLI Entry Point Test**
   ```bash
   node bin/kode.js --help
   ```
   ✓ Expected: Help text should be displayed without errors

2. **Development Mode Test**
   ```bash
   pnpm run dev
   ```
   ✓ Expected: Application should start in development mode without errors

3. **Built Version Test**
   ```bash
   node dist/entrypoints/cli.js
   ```
   ✓ Expected: Application should start without errors

## Core Command Tests

Run the application and execute these commands:

1. **Help Command**
   ```
   /help
   ```
   ✓ Expected: Help information should be displayed

2. **Model Command**
   ```
   /model
   ```
   ✓ Expected: Model selection interface should be displayed

3. **Config Command**
   ```
   /config
   ```
   ✓ Expected: Configuration interface should be displayed

## File Operation Tests

1. **List Directory**
   ```
   ls
   ```
   ✓ Expected: Directory listing should be displayed

2. **Create and Read File**
   ```
   echo "test content" > test.txt
   cat test.txt
   ```
   ✓ Expected: File should be created and content should be displayed

3. **File Read via AI**
   Enter prompt:
   ```
   Please read the content of test.txt and tell me what it says
   ```
   ✓ Expected: AI should read and report the file contents

4. **File Edit via AI**
   Enter prompt:
   ```
   Please add a second line saying "ESM migration successful" to test.txt
   ```
   ✓ Expected: AI should update the file and show a diff

## Complex Feature Tests

1. **Conversation Context Test**
   - Start a new conversation about a specific topic
   - Ask a follow-up question that relies on previous context
   ✓ Expected: AI should maintain context between messages

2. **Tool Use Test**
   Enter prompt:
   ```
   Please count how many JavaScript files exist in the src directory
   ```
   ✓ Expected: AI should use tools to count files and provide an answer

3. **Bash Command Execution**
   Enter prompt:
   ```
   Run a command to find all TypeScript files in the src directory
   ```
   ✓ Expected: AI should suggest and execute a bash command

## Error Handling Tests

1. **Invalid Command Test**
   ```
   /invalidcommand
   ```
   ✓ Expected: Error message should be displayed gracefully

2. **Network Interruption Simulation**
   - Disconnect internet while AI is generating a response
   ✓ Expected: Application should handle the interruption gracefully

3. **Large Response Test**
   Enter prompt:
   ```
   Please write a detailed explanation of JavaScript modules, including CommonJS and ESM, with code examples for each.
   ```
   ✓ Expected: Application should handle large response without crashing

## Module Resolution Tests

These tests specifically check for ESM-related functionality:

1. **Dynamic Import Test**
   Enter prompt:
   ```
   Could you look at how dynamic imports are handled in the codebase? Please check src/utils/messages.tsx for examples.
   ```
   ✓ Expected: AI should process the request without errors

2. **JSON Handling Test**
   Enter prompt:
   ```
   Please check package.json and tell me the current version number
   ```
   ✓ Expected: AI should correctly read and parse the JSON file

## Cleanup

After testing:
1. Remove test files:
   ```
   rm test.txt
   ```
2. Record any issues encountered in a separate document

## Troubleshooting

If you encounter issues:
1. Check the console for error messages
2. Review the `.CLAUDE/esm-runtime-troubleshooting-guide.md` file for solutions
3. Run with verbose logging:
   ```
   NODE_ENV=development pnpm run dev --verbose --debug
   ```
