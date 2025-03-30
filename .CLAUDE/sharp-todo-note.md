# TODO: Sharp Image Processing Limitations

## Current Status

The project currently uses platform-specific Sharp packages as optional dependencies:
```json
"optionalDependencies": {
  "@img/sharp-darwin-arm64": "^0.33.5",
  "@img/sharp-linux-arm": "^0.33.5",
  "@img/sharp-linux-x64": "^0.33.5",
  "@img/sharp-win32-x64": "^0.33.5"
}
```

However, there are limitations with this setup:

1. **TypeScript Support**: The main 'sharp' package isn't installed, so TypeScript doesn't have its type declarations. We've created a minimal type declaration file in `src/types/sharp.d.ts` to address this, but it's incomplete.

2. **Potential Feature Gap**: We can't currently use Sharp for sending images to LLMs, which would be a valuable feature. The FileReadTool can read images, but we don't have full image processing capabilities.

## Future Improvements

1. **Consider Direct Installation**: If image processing becomes critical, we might need to install the main 'sharp' package directly. However, this could cause dependency conflicts with react-devtools-core (as seen in our attempts to install it).

2. **Enhanced Type Declarations**: Expand our custom type declarations to cover more Sharp functionality as needed.

3. **Alternative Solutions**: If Sharp continues to cause dependency issues, consider alternatives like:
   - Using a different image processing library
   - Creating a separate service for image processing
   - Using browser APIs where applicable

## Priority

This is not a high-priority issue, as image processing for LLMs is a nice-to-have feature rather than a core requirement. The code works with the current setup for basic image reading capabilities.
