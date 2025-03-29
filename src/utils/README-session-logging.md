# Session Logging

This feature provides comprehensive logging of all interactions with the AI assistant, including user inputs, model responses, tool calls, and conversation management events.

## Configuration

Logging can be enabled/disabled through the `/config` menu. Two main settings are available:

- **Enable Session Logging**: Toggle to turn logging on or off (default: off)
- **Session Log Path**: Directory where logs will be stored (default: `.KODING-LOGS`)

## Log Format

All logs are stored as JSON entries, one per line, with these common fields:

- `timestamp`: ISO 8601 timestamp in UTC
- `type`: Event type (user_message, assistant_message, tool_call, command, fork, context_change)
- `id`: Unique identifier for the message/event (when applicable)
- `content`: The main content of the event

## Log Types

### User Messages

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

### Assistant Messages

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

### Tool Calls

Tool request:
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

Tool result:
```json
{
  "timestamp": "2024-03-28T10:15:42.123Z",
  "type": "tool_call",
  "id": "tool-uuid",
  "tool": "FileReadTool",
  "content": {
    "action": "result",
    "output": "File content here",
    "status": "success"
  }
}
```

### Commands

```json
{
  "timestamp": "2024-03-28T10:15:50.456Z",
  "type": "command",
  "content": {
    "command": "clear",
    "args": null
  }
}
```

### Conversation Forks

```json
{
  "timestamp": "2024-03-28T10:16:00.789Z",
  "type": "fork",
  "content": {
    "new_fork_id": 2,
    "reason": "User requested fork (escape to undo)"
  }
}
```

### Context Changes

```json
{
  "timestamp": "2024-03-28T10:16:10.123Z",
  "type": "context_change",
  "content": {
    "action": "compact",
    "summary": "Summary of the conversation that was compacted"
  }
}
```

## Deduplication

The logging system automatically deduplicates messages by tracking message IDs. This ensures that if the same message is included in multiple API calls (such as in conversation history), it will only be logged once.

## File Organization

Each log file is named with a timestamp for when the session started and a unique session ID:

```
session-2024-03-28T10-15-00-12345.log
```

A new log file is created each time you start a new session.

## Performance Impact

The logging feature is designed to have minimal performance impact, with non-blocking file operations and efficient message tracking. However, if you notice performance issues, you can disable logging through the `/config` menu.