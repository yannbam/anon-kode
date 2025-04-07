# ESM Migration: Testing Plan & Status

## Priority Testing Areas

### Critical Path Tests (Must Pass)
- ✅ **Application Startup**: Basic startup and CLI entry point functioning
- ✅ **Core Commands**: Basic slash commands (/help, /model, etc.)
- ⚠️ **API Integration**: Connection to LLM providers
  - ✅ OpenRouter
  - ❗ Anthropic API ("Not Found" error - WIP feature)
  - ❓ OpenAI (not tested yet)
- ❗ **Model Selection**: Switching between models
- ❗ **File System Operations**: Reading/writing files, editing with diffs
- ❗ **Shell Command Execution**: Basic shell commands and output capturing

### High Priority Runtime Features
- ❗ **Dynamic Imports**: Features using dynamic imports
- ❗ **Response Streaming**: LLM response streaming
- ❗ **Error Handling**: Network errors and API failures
- ❗ **Resource Management**: Proper resource cleanup on shutdown

### Known Issues (From TODO.md)

#### 1. Anthropic API Not Found Error
- **Root Cause**: Anthropic provider is commented out in `models.ts` (WIP feature)
- **Status**: Not an ESM issue but a pre-existing API compatibility issue
- **Action**: Leave as-is since it's marked as work in progress

#### 2. Terminal Rendering Issues
- **Model Selector Escape Key Issue**: 
  - UI disappears when ESC is pressed in model selection screen
  - Application still responds but UI is blank
  - Attempted fixes haven't fully resolved the issue
  - **Priority**: Medium

- **UI Text Duplication**: 
  - Dialog content renders twice - in and outside the dialog box
  - Affects ModelSelector component
  - **Priority**: Low (doesn't affect functionality)

#### 3. Sharp Image Processing
- Image processing limitations due to dependency structure
- Using platform-specific packages as optional dependencies
- Limited ability to process images for LLMs

## Testing Procedure

### Manual Test Script
1. **Verify basic startup**:
   ```bash
   pnpm run build
   node bin/kode.js --help
   ```

2. **Test core commands**:
   - Run `/help` command
   - Run `/model` command
   - Run `/config` command

3. **Test file operations**:
   - Create and read a test file
   - Request AI to edit a file
   - Check diff rendering

4. **Test API integration**:
   - Ask a simple question to test API connection
   - Check response streaming
   - Try switching between models

5. **Error handling and edge cases**:
   - Test with network interruption
   - Test with invalid inputs

### Verbose Error Detection
Run with debug flags to catch hidden errors:
```bash
NODE_ENV=development pnpm run dev --verbose --debug
```

## Completion Criteria

The ESM migration will be considered complete when:
1. All critical path tests pass without errors
2. Any remaining UI rendering issues are documented and prioritized
3. No runtime JavaScript errors occur during normal operation
4. No TypeScript compilation errors remain
5. Performance is comparable to pre-ESM version

## Next Steps

1. Complete testing of file system operations
2. Test model selection and streaming thoroughly
3. Document any remaining UI rendering issues with screenshots
4. Create a final testing report with recommendations