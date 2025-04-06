# TODOs

## ESM Migration Testing Issues

### Anthropic API Not Found Error
- **Issue**: When testing connection to Anthropic API, getting a "API request failed: Not Found" error
- **Root cause**: The Anthropic API provider is commented out in `models.ts` with status: "wip" (work in progress)
- **Analysis**: Looking at the `claude.ts` service in the application, it appears the code is trying to connect to the Anthropic API using the OpenAI client with the Anthropic base URL. This is likely failing because:
  1. The Anthropic provider may not be fully implemented yet (marked as "wip")
  2. The OpenAI client is being used to access the Anthropic API, but Anthropic's API structure is different
  3. The path being requested likely doesn't exist on the Anthropic API server
- **Status**: Not a direct ESM migration issue, but a pre-existing API compatibility issue
- **Recommendation**: Leave as is for now, since it's marked as work in progress

## Terminal Rendering Issues

### Model Selector Escape Key Problem
- **Issue**: When pressing Escape on the model selection screen (especially on the "choose between large/small/both model" screen), the terminal briefly shows some content but then goes blank
- **Current behavior**: The application still responds (pressing space shows the command line again) but the UI disappears
- **Attempted fixes**: 
  - Added null checks and better error handling for Escape key navigation
  - Modified terminal clearing sequence
  - Added screen refresh mechanisms
  - None of these completely resolved the issue
- **Priority**: Medium
- **Possible cause**: Interaction between Ink rendering and terminal control sequences

### UI Text Duplication Issue
- **Issue**: Dialog content appears to be rendering twice - once in the dialog box and once above it
- **Current behavior**: When opening the Model Selector dialog, the same text appears duplicated outside the dialog boundary
- **First observed**: After ESM migration, in the ModelSelector component
- **May also affect**: Other dialog components and possibly the prompt input area
- **Priority**: Low (doesn't affect functionality)
- **Possible cause**: React re-rendering issue or Ink component rendering behavior changes in ESM context

## Sharp Image Processing

```typescript
// TODO: Sharp image processing currently can't be used directly due to dependency conflicts
// The codebase uses platform-specific @img/sharp-* packages as optional dependencies
// If we need to send images to the LLMs in the future, we'll need to resolve this
// by either:
//   1. Finding a way to make sharp work with the current dependency structure
//   2. Using a different image processing library
//   3. Implementing a more focused solution for the specific image tasks needed
```
