## TODO Note About Sharp

```typescript
// TODO: Sharp image processing currently can't be used directly due to dependency conflicts
// The codebase uses platform-specific @img/sharp-* packages as optional dependencies
// If we need to send images to the LLMs in the future, we'll need to resolve this
// by either:
//   1. Finding a way to make sharp work with the current dependency structure
//   2. Using a different image processing library
//   3. Implementing a more focused solution for the specific image tasks needed
```
