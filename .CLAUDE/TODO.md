# TODOs

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
