# Comprehensive Logging

Anon-Kode includes a comprehensive logging system that can record both formatted conversation logs and raw API interactions. This document explains how to use and configure the logging system.

## Logging Configuration

You can enable and configure logging through the `/config` command. The following options are available:

- **Enable Session Logging**: Toggle to turn logging on or off (default: off)
- **Logging Mode**: Choose between `formatted`, `raw`, or `both` (default: formatted)
- **Session Log Path**: Directory where logs will be stored (default: `.KODING-LOGS`)

## Log Types

The logging system supports two main types of logs:

### 1. Formatted Logs

Formatted logs provide a human-readable record of conversations and interactions, focusing on the content of messages rather than the raw API requests and responses.

These logs include:
- User messages
- Assistant responses
- Tool calls (requests and results)
- Command executions
- Conversation forks
- Context changes (clear or compact)

Log filename format: `session-TIMESTAMP-SESSION_ID-formatted.log`

### 2. Raw Logs

Raw logs capture the complete, unformatted API requests and responses. These are useful for debugging, auditing, and understanding the internal API communication.

These logs include:
- API requests with full headers and body (sensitive information redacted)
- API responses with status codes, headers, and body
- Stream chunks for streaming responses
- API errors with full error details

Log filename format: `session-TIMESTAMP-SESSION_ID-raw.log`

## Log Format

### Formatted Log Examples

**User Message:**
```json
{
  "timestamp": "2024-03-28T10:15:32.123Z",
  "type": "user_message",
  "id": "message-uuid",
  "content": {
    "text": "Your message text here"
  }
}
```

**Assistant Message:**
```json
{
  "timestamp": "2024-03-28T10:15:35.456Z",
  "type": "assistant_message",
  "id": "message-uuid",
  "model": "claude-3-7-sonnet-20250219",
  "content": {
    "text": "Assistant's response here"
  }
}
```

**Tool Call:**
```json
{
  "timestamp": "2024-03-28T10:15:40.789Z",
  "type": "tool_call",
  "id": "tool-uuid",
  "tool": "FileReadTool",
  "input": {
    "file_path": "/path/to/file.txt"
  },
  "status": "pending",
  "content": {
    "action": "request",
    "tool": "FileReadTool",
    "input": {
      "file_path": "/path/to/file.txt"
    }
  }
}
```

### Raw Log Examples

**API Request:**
```json
{
  "timestamp": "2024-03-28T10:15:32.123Z",
  "type": "api_request",
  "provider": "openai",
  "request_id": "request-uuid",
  "data": {
    "endpoint": "https://api.openai.com/v1/chat/completions",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer [REDACTED]"
    },
    "body": {
      "model": "gpt-4",
      "messages": [
        {
          "role": "user",
          "content": "Hello, how are you?"
        }
      ],
      "temperature": 1
    }
  }
}
```

**API Response:**
```json
{
  "timestamp": "2024-03-28T10:15:35.456Z",
  "type": "api_response",
  "provider": "openai",
  "request_id": "request-uuid",
  "data": {
    "status": 200,
    "headers": {
      "content-type": "application/json"
    },
    "body": {
      "id": "chatcmpl-abc123",
      "object": "chat.completion",
      "created": 1711615789,
      "model": "gpt-4",
      "choices": [
        {
          "index": 0,
          "message": {
            "role": "assistant",
            "content": "I'm doing well, thank you for asking! How can I help you today?"
          },
          "finish_reason": "stop"
        }
      ],
      "usage": {
        "prompt_tokens": 13,
        "completion_tokens": 16,
        "total_tokens": 29
      }
    },
    "duration_ms": 2340
  }
}
```

**Stream Chunk:**
```json
{
  "timestamp": "2024-03-28T10:15:33.100Z",
  "type": "api_stream_chunk",
  "provider": "openai",
  "request_id": "request-uuid",
  "chunk_index": 0,
  "data": {
    "id": "chatcmpl-abc123",
    "object": "chat.completion.chunk",
    "created": 1711615789,
    "model": "gpt-4",
    "choices": [
      {
        "index": 0,
        "delta": {
          "role": "assistant",
          "content": "I'm"
        },
        "finish_reason": null
      }
    ]
  }
}
```

**API Error:**
```json
{
  "timestamp": "2024-03-28T10:15:40.789Z",
  "type": "api_error",
  "provider": "openai",
  "request_id": "request-uuid",
  "data": {
    "error": "Rate limit exceeded",
    "stack": "Error: Rate limit exceeded\n    at handleApiError (/path/to/openai.ts:123:45)\n    at getCompletion (/path/to/openai.ts:456:78)",
    "duration_ms": 150
  }
}
```

## Implementation Details

- All logs use JSON format for easy parsing and analysis
- Raw logs use UUIDs to correlate requests with responses
- API keys and other sensitive information are automatically redacted
- Logs are stored in separate files based on logging mode and session ID
- Requests and responses are logged with timestamps and duration information

## Use Cases

### Formatted Logs

- Reviewing conversation history
- Analyzing assistant responses
- Understanding tool usage patterns
- Troubleshooting user experience issues

### Raw Logs

- Debugging API integration issues
- Analyzing API performance
- Auditing API usage
- Developing new API-related features
- Understanding rate limiting and error behavior

## Performance Considerations

The logging system is designed to have minimal impact on performance, but enabling both `formatted` and `raw` logging modes simultaneously may cause a slight performance overhead.

Raw logging in particular can generate large log files when using streaming APIs with many small chunks. Consider using `formatted` mode for regular use and only enabling `raw` mode when debugging or troubleshooting specific issues.

## Log Management

Log files can accumulate over time. Consider implementing a log rotation strategy or cleaning up old log files periodically.