# Anthropic Beta Features Usage Note

During our implementation of direct Anthropic API calls, we encountered issues with beta features. The error was:

```
{"type":"error","error":{"type":"invalid_request_error","message":"Unexpected value(s)
`tool_use:logging=false` for the `anthropic-beta` header. Please consult our documentation at
docs.anthropic.com or try again without the header."}}
```

## Current Solution

We've temporarily removed beta features from the implementation to get the basic functionality working.

## TODO: Research Proper Usage

Research how to properly use beta features with the Anthropic SDK (version 0.39.0+):

1. Check if the beta features should be passed via:
   - HTTP header (`anthropic-beta` header) rather than request body
   - Different parameter name in the SDK
   - Different format for beta feature names

2. Check Anthropic's latest documentation for the correct syntax

3. Verify which beta features are currently supported for the models we're using

4. Test implementation with proper error handling for unsupported features

Reference: Conversation from April 6, 2025
