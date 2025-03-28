# Anon-Kode: Executive Architecture Summary

## Overview

Anon-Kode is a sophisticated terminal-based AI coding assistant that leverages large language models (LLMs) to provide intelligent code assistance, project management, and automation capabilities. The architecture is designed around a core message-passing system with a tool-based execution model that allows for secure, controlled interactions between the AI and the user's local development environment.

## System Architecture Philosophy

Anon-Kode follows several key architectural principles:

1. **Tool-based Execution**: All actions are performed through a well-defined tool interface, creating clear boundaries between the AI's capabilities and the local environment.

2. **Permission-based Security**: Every action that could potentially modify the file system or execute commands requires explicit user permission.

3. **Extensibility**: The system is designed for easy extension with new tools and capabilities through a modular architecture.

4. **Reactive Terminal UI**: Built with React and Ink to provide a responsive terminal interface that adapts to user interactions.

5. **Message-based Interaction**: Communication between components follows a structured message pattern that supports both synchronous and asynchronous operations.

## Key Technical Components

The system is comprised of the following major components:

### Core Components

1. **Tool System**: The foundation of interaction between the AI and the local environment, implemented through a common interface that handles permissions, validation, and execution.

2. **Query System**: Manages the flow of messages between the user, the LLM, and tools, coordinating permission requests and handling response streaming.

3. **Agent System**: Allows autonomous sub-agents to be created for specific tasks, providing isolation and focused capabilities.

4. **MCP (Model Context Protocol) System**: Enables integration with external tools through a standardized protocol, expanding the system's capabilities beyond built-in tools.

### User Interface

1. **Terminal UI**: React/Ink-based terminal interface that handles user input, displays AI responses, and manages interactive elements like permission dialogs.

2. **Command System**: Processes slash commands for system control and provides type-ahead suggestions.

3. **Message Rendering**: Specialized components for rendering different message types, including tool use, thinking blocks, and text responses.

### Backend Services

1. **Model Integration**: Abstract interfaces for different LLM providers (Claude, OpenAI) with error handling and retry logic.

2. **Persistent Storage**: Configuration and conversation history management across sessions.

3. **Telemetry & Analytics**: Anonymized usage tracking and error reporting for system improvement.

## Architectural Patterns

Anon-Kode employs several architectural patterns:

1. **Command Pattern**: Used in the tools system to encapsulate requests as objects.

2. **Adapter Pattern**: Applied in model integrations to provide a consistent interface across different providers.

3. **Factory Pattern**: For tool creation and management.

4. **Observer Pattern**: For event handling and state updates in the UI.

5. **Chain of Responsibility**: For permission handling and tool validation.

6. **Proxy Pattern**: Used in the MCP system to delegate requests to external tools.

## Critical Design Decisions

### Tool-first Architecture

The decision to use tools as the primary abstraction for all actions creates a consistent interface for both built-in and external capabilities, enabling security controls and enhancing extensibility. This approach also allows for fine-grained permissions and user control over AI actions.

### Terminal-based UI

Using a terminal interface rather than a graphical one enables seamless integration with developers' existing workflows and tools. The React/Ink implementation provides modern UI capabilities within terminal constraints.

### Permission Model

The explicit permission model for file system access and command execution establishes trust with users and prevents unexpected or unwanted changes to the local environment. This model supports different permission scopes (per-session, remembered, etc.).

### Agent Orchestration

Enabling the main assistant to spawn sub-agents for specific tasks allows the system to balance focused expertise with overall conversation coherence. This architecture supports specialized capabilities without cluttering the main interaction.

### Model Provider Abstraction

By abstracting away the specifics of different LLM providers, the system can easily switch between models and adapt to new providers without significant architectural changes.

### MCP Protocol Integration

The adoption of the Model Context Protocol creates a standardized way for external tools to integrate with the system, significantly extending capabilities without requiring changes to the core architecture.

The architecture balances security, extensibility, and usability, creating a system that can be trusted with sensitive development environments while providing powerful AI-assisted coding capabilities.# Anon-Kode: Component Architecture Analysis

## Core Backend Architecture

The Anon-Kode backend is structured around a modular component system that facilitates interaction between the user, the LLM, and the local environment. This document details the major components, their relationships, and the data flow between them.

### Tool System

The Tool system is the foundation of Anon-Kode's interaction capabilities, providing a standardized interface for all actions.

#### Tool Interface Definition

The core `Tool` interface (defined in `Tool.ts`) establishes the contract for all tools:

```typescript
export interface Tool {
  name: string
  description?: string
  inputSchema: z.ZodObject<any>
  inputJSONSchema?: Record<string, unknown>
  prompt: (options: { dangerouslySkipPermissions: boolean }) => Promise<string>
}
```

Key aspects of this interface include:
- **Name**: Unique identifier for the tool
- **Input Schema**: Zod schema for validating inputs
- **Prompt**: Method to generate a description of the tool for the LLM

Additional methods commonly implemented by tools include:
- **call**: Actual implementation of the tool functionality
- **isReadOnly**: Indicates if the tool can modify the local environment
- **isEnabled**: Dynamically determines if the tool should be available
- **needsPermissions**: Indicates if user permission is required
- **renderToolUseMessage**: Customizes how tool invocations are displayed

#### Tool Lifecycle

Tools follow a consistent lifecycle:

1. **Registration**: Tools are registered in the system through the `tools.ts` module
2. **Discovery**: Available tools are collected via `getAllTools()/getTools()`
3. **Validation**: Tool inputs are validated against their schema
4. **Permission Check**: User permission is requested if needed
5. **Execution**: The tool's functionality is executed
6. **Result Handling**: Results are formatted and returned to the LLM

#### Tool Categories

Tools are organized into several categories:

1. **Filesystem Tools**:
   - `FileReadTool`: Reads file content
   - `FileEditTool`: Modifies file content
   - `FileWriteTool`: Creates or overwrites files
   - `GlobTool`: Finds files matching patterns
   - `GrepTool`: Searches file contents
   - `LSTool`: Lists directory contents

2. **Execution Tools**:
   - `BashTool`: Executes shell commands

3. **Notebook Tools**:
   - `NotebookReadTool`: Reads Jupyter notebooks
   - `NotebookEditTool`: Edits Jupyter notebooks

4. **Agent Tools**:
   - `AgentTool`: Creates sub-agents for specific tasks
   - `ArchitectTool`: Specialized agent for architectural tasks

5. **Utility Tools**:
   - `ThinkTool`: Allows the LLM to think/brainstorm
   - `MemoryReadTool/MemoryWriteTool`: Manages persistent memory

6. **External Tools**:
   - `MCPTool`: Bridge to external tools using the MCP protocol

### Query System

The Query System (`query.ts`) is responsible for managing the message flow between the user, the LLM, and tools.

#### Message Processing Pipeline

1. **Input Processing**: User messages are normalized and formatted for the LLM
2. **LLM Query**: Messages are sent to the LLM with system prompts and context
3. **Response Handling**: The LLM's response is processed and streamed to the UI
4. **Tool Use Detection**: Tool use requests in the LLM response are identified
5. **Tool Execution**: Requested tools are executed (serially or concurrently)
6. **Result Integration**: Tool results are sent back to the LLM for further processing

#### Concurrency Management

The Query System employs two strategies for tool execution:

1. **Serial Execution**: Used when tools may have interdependencies or modify state
2. **Concurrent Execution**: Used for read-only tools to improve performance

The decision between serial and concurrent execution is made based on whether all requested tools are read-only.

#### Error Handling

The Query System implements comprehensive error handling:

1. **Tool Validation Errors**: Catches and reports input validation issues
2. **Permission Denials**: Handles cases where users deny permission
3. **Execution Errors**: Catches and formats errors during tool execution
4. **LLM API Errors**: Handles and retries on connection issues

### Agent System

The Agent System enables the creation of sub-agents for specialized tasks, implemented primarily through `AgentTool.tsx`.

#### Agent Creation and Configuration

Agents are created by:

1. Initializing a new message context
2. Configuring available tools for the agent
3. Setting up an isolated prompt environment
4. Establishing communication channels

#### Agent Execution Flow

1. **Initialization**: Agent is created with a specific task prompt
2. **Tool Configuration**: A subset of tools is made available to the agent
3. **Execution**: The agent runs in its own context, using tools as needed
4. **Progress Reporting**: Intermediate progress is reported back to the main system
5. **Result Collection**: Final results are returned to the main system

#### Agent Permission Model

Agents operate under a delegated permission model:

1. Tools used by agents still require user permission
2. Permission requests are proxied through the main system
3. Permissions can be remembered across agent invocations

### MCP (Model Context Protocol) System

The MCP System (`mcpClient.ts`) provides a standardized protocol for external tool integration.

#### Server Discovery and Registration

MCP servers are discovered and registered from multiple sources:

1. **Global Configuration**: System-wide MCP servers
2. **Project Configuration**: Project-specific MCP servers
3. **.mcprc Files**: Repository-specific MCP servers

Registration is managed through configuration files with different scopes.

#### Client-Server Communication

Communication follows the Model Context Protocol specification:

1. **Connection**: Established via stdio or SSE (Server-Sent Events)
2. **Capability Discovery**: Determines available tools and capabilities
3. **Request-Response**: JSON-based protocol for tool execution
4. **Resource Handling**: Manages binary data like images

#### Security Model

The MCP security model includes:

1. **Server Approval**: Users must explicitly approve .mcprc servers
2. **Scope Isolation**: Servers have defined scopes (global, project, or mcprc)
3. **Permission Inheritance**: MCP tools use the same permission model as built-in tools

## State Management Architecture

Anon-Kode implements a multi-layered state management approach:

### Global State

1. **Configuration State**: Global and project-specific settings
2. **Session State**: Current conversation history and context
3. **Authentication State**: API keys and user identity

### Component State

1. **UI State**: Managed through React hooks
2. **Tool State**: Encapsulated within individual tools
3. **Message State**: Tracks conversation flow and tool use results

### Persistence Layer

1. **Configuration Files**: For global and project settings
2. **Conversation History**: For resuming sessions
3. **Permission Memory**: For remembered tool permissions

## Data Flow Architecture

The data flow in Anon-Kode follows a cyclical pattern:

### User Input → LLM Flow

1. User provides input through the terminal
2. Input is formatted as a message and added to the conversation
3. The full conversation context is sent to the LLM
4. The LLM generates a response that may include tool use requests

### LLM → Tool Flow

1. Tool use requests are extracted from the LLM response
2. Permission is requested from the user if needed
3. Tool inputs are validated and normalized
4. Tools are executed (serially or concurrently)
5. Results are formatted for LLM consumption

### Tool → LLM Flow

1. Tool results are formatted as messages
2. Results are added to the conversation context
3. The updated context is sent back to the LLM
4. The LLM generates a new response incorporating the tool results

### LLM → User Flow

1. LLM responses are streamed to the user interface
2. Special blocks (like thinking) are rendered appropriately
3. Tool use and results are visually presented
4. The UI updates to reflect the current conversation state

This architecture creates a flexible, extensible system that balances security and capability while maintaining a cohesive user experience across different types of interactions.# Anon-Kode: AI System Architecture Deep-Dive

## LLM Integration Architecture

Anon-Kode employs a sophisticated abstraction layer to integrate with multiple language model providers while maintaining a consistent interface throughout the application.

### Model Abstraction and Provider Integration

The system's integration with LLMs is primarily handled through the `claude.ts` service, which creates a flexible abstraction over different model providers:

#### Provider Adapters

The system supports multiple deployment options through dedicated adapters:

1. **Direct API Integration**:
   - Primary implementation using the Anthropic Client SDK
   - Handles authentication, rate limiting, and error handling

2. **AWS Bedrock Integration**:
   - Uses AnthropicBedrock client for AWS-hosted models
   - Configured through standard AWS credentials

3. **Google Vertex AI Integration**:
   - Uses AnthropicVertex client for Google Cloud-hosted models
   - Supports region-specific configuration for optimal latency

4. **OpenAI Integration**:
   - Alternative provider option through `openai.ts`
   - Message format translation between different provider formats

#### Provider Selection Logic

The provider selection follows a priority chain:

1. Environment variables (USE_BEDROCK, USE_VERTEX)
2. Configuration settings
3. Default direct API access

#### Model Configuration

Models are configured through a multi-tiered system:

1. **Model Types**:
   - Large models (e.g., Claude 3.5/3.7 Sonnet) for main interactions
   - Small models (e.g., Claude 3.5 Haiku) for lightweight operations

2. **Regional Configuration**:
   - Model-specific region variables (e.g., VERTEX_REGION_CLAUDE_3_5_SONNET)
   - Global fallback regions

3. **Token Management**:
   - Configurable token limits per model type
   - Dynamic adjustment based on conversation complexity

### Connection and Authentication Management

The system implements robust connection handling:

1. **Authentication Methods**:
   - API key authentication (stored in user config)
   - OAuth flows for console access
   - Cloud provider credentials

2. **Connection Resilience**:
   - Exponential backoff retry logic
   - Error categorization and specific handling strategies
   - Circuit breaking on persistent failures

3. **Client Lifecycle**:
   - Lazy initialization of clients
   - Singleton pattern with reset capability
   - Connection pooling for performance

### Message Transformation Pipeline

Messages undergo several transformations before reaching the LLM:

1. **Normalization**: Converting internal message formats to provider-specific formats
2. **Context Injection**: Adding system prompts and contextual information
3. **Thinking Integration**: Adding thinking blocks for reasoning capabilities
4. **Tool Description Injection**: Providing tool schemas and descriptions

## Agent Orchestration Framework

The agent orchestration system enables the main AI to delegate specific tasks to sub-agents.

### Agent Creation and Lifecycle

Agents are instantiated through a well-defined process:

1. **Initialization**:
   - Created via the `AgentTool` interface
   - Configured with specific prompt and purpose
   - Assigned appropriate tool access

2. **Execution**:
   - Run in isolated conversation context
   - Access to a dedicated set of tools
   - Progress reporting back to main conversation

3. **Termination**:
   - Results collection and formatting
   - Resource cleanup
   - Message integration back to main conversation

### Agent Isolation and State Management

Each agent maintains isolation through:

1. **Conversation Boundaries**:
   - Separate message history
   - Distinct system prompts
   - Dedicated thinking context

2. **Tool Access Control**:
   - Explicitly allowed set of tools (usually read-only)
   - Delegated permission model
   - Tool use tracking and reporting

3. **Progress Tracking**:
   - Agent-specific log files
   - Streaming progress updates
   - Tool use statistics

### Communication Protocol Between Main System and Agents

The communication between the main system and agents follows a structured protocol:

1. **Agent Creation**:
   - Task description in natural language
   - Tool access specification
   - Resource constraints

2. **Progress Updates**:
   - Tool use notifications
   - Intermediate thinking results
   - Status indicators

3. **Result Communication**:
   - Final response in structured format
   - Tool use summary
   - Performance metrics

## Tool Execution Pipeline

The tool execution system is the bridge between the AI's intentions and actions in the local environment.

### Tool Request Parsing and Validation

Tool requests go through several validation stages:

1. **Structural Validation**:
   - Checking for required fields (name, inputs)
   - Validating against tool JSON schema
   - Type checking of parameters

2. **Semantic Validation**:
   - Context-specific validation rules
   - Parameter interdependency checks
   - Security constraint validation

3. **Permission Validation**:
   - Checking if the tool requires permission
   - Retrieving or requesting user permission
   - Respecting remembered permissions

### Tool Execution and Result Processing

Once validated, tools are executed through a consistent process:

1. **Preparation**:
   - Input normalization
   - Resource allocation
   - Environment setup

2. **Execution**:
   - Synchronous or generator-based async execution
   - Progress reporting
   - Error handling

3. **Result Formatting**:
   - Structuring for LLM consumption
   - Adding metadata
   - Handling binary data (images, etc.)

### Concurrent Tool Execution

The system optimizes performance through concurrent execution where appropriate:

1. **Concurrency Decision**:
   - Based on tool read-only status
   - Resource requirements analysis
   - Dependency checking

2. **Execution Strategies**:
   - Parallel execution for independent tools
   - Sequential execution for dependent operations
   - Hybrid approaches for complex scenarios

3. **Result Synchronization**:
   - Ordered result collection
   - Consistent message ordering
   - Proper attribution in the conversation

## Prompt Engineering Patterns

Anon-Kode employs sophisticated prompt engineering to guide the AI's behavior.

### System Prompt Architecture

The system prompt is structured in layers:

1. **Core Identity Layer**:
   - Basic capabilities and constraints
   - Ethical guidelines and limitations
   - Persona definition

2. **Tool Interaction Layer**:
   - Tool use guidelines
   - Decision criteria for tool selection
   - Error handling instructions

3. **Context Layer**:
   - Dynamic context injection
   - Environment information
   - User preferences

### Tool Description Templates

Tools are described to the LLM using carefully crafted templates:

1. **Capability Description**:
   - What the tool does
   - Input parameters and their meaning
   - Expected output format

2. **Usage Guidelines**:
   - When to use the tool
   - Best practices
   - Common pitfalls

3. **Examples**:
   - Sample inputs and outputs
   - Error scenarios
   - Edge cases

### Thinking Framework

The system implements a structured thinking framework via the `ThinkTool`:

1. **Thinking Blocks**:
   - Special message blocks for reasoning
   - Optionally visible to users
   - Preserved across conversation turns

2. **Reasoning Effort Control**:
   - Configurable depth of thinking
   - Adaptive based on task complexity
   - User preference respecting

3. **Thinking Rules**:
   - Guidelines for structured reasoning
   - Multi-step problem solving approaches
   - Self-critique mechanisms

## Message Processing Workflow

Messages flow through the system following a consistent pattern.

### User Input Processing

1. **Capture and Normalization**:
   - Terminal input capture
   - Command detection
   - Message formatting

2. **Context Enrichment**:
   - Adding conversation history
   - Including system information
   - Attaching relevant metadata

3. **Query Preparation**:
   - Formatting for LLM consumption
   - System prompt integration
   - Tool description inclusion

### LLM Interaction Flow

1. **Request Transmission**:
   - Authentication and headers
   - Provider-specific formatting
   - Retry handling

2. **Response Streaming**:
   - Chunk processing
   - Immediate display
   - Tool use detection

3. **Post-Processing**:
   - Message normalization
   - Special block handling
   - Cost tracking

### Tool Use Integration

1. **Detection Phase**:
   - Parsing tool use blocks
   - Matching with available tools
   - Validation preparation

2. **Permission Phase**:
   - Permission requirement check
   - User permission request
   - Permission response handling

3. **Execution Phase**:
   - Tool invocation
   - Progress updates
   - Result collection

4. **Integration Phase**:
   - Result formatting for LLM
   - Adding to conversation context
   - Triggering follow-up LLM response

### Response Rendering Pipeline

1. **Message Typing**:
   - Identifying message types
   - Applying appropriate renderers
   - Managing special blocks

2. **Formatting**:
   - Markdown processing
   - Syntax highlighting
   - Layout optimization

3. **Interactive Elements**:
   - Tool use visualization
   - Permission request UI
   - Progress indicators

This AI system architecture creates a cohesive, extensible framework that balances power and safety while providing a smooth user experience. The careful abstraction of model providers, robust tool execution pipeline, and sophisticated prompt engineering combine to create an AI coding assistant that can effectively understand and assist with complex development tasks.# Anon-Kode: Technical Implementation Details

## Core Abstractions and Interfaces

Anon-Kode is built upon a foundation of carefully designed abstractions that enable flexibility, extensibility, and security. This section examines the key interfaces and abstractions that form the system's backbone.

### Tool Interface

The `Tool` interface is the primary abstraction for all actions the AI can take:

```typescript
export interface Tool {
  name: string
  description?: string
  inputSchema: z.ZodObject<any>
  inputJSONSchema?: Record<string, unknown>
  prompt: (options: { dangerouslySkipPermissions: boolean }) => Promise<string>
}
```

This minimal interface is extended by actual tool implementations to include:

```typescript
// Common additional methods (not in base interface)
async *call(input, context) { /* implementation */ }
isReadOnly() { /* implementation */ }
async isEnabled() { /* implementation */ }
needsPermissions() { /* implementation */ }
renderToolUseMessage() { /* implementation */ }
```

This design allows for a consistent approach to tool handling while providing flexibility for different tool behaviors.

### Message Types

Messages are represented through a type hierarchy that models the conversation flow:

```typescript
export type UserMessage = {
  message: MessageParam
  type: 'user'
  uuid: UUID
  toolUseResult?: FullToolUseResult
}

export type AssistantMessage = {
  costUSD: number
  durationMs: number
  message: APIAssistantMessage
  type: 'assistant'
  uuid: UUID
  isApiErrorMessage?: boolean
}

export type ProgressMessage = {
  content: AssistantMessage
  normalizedMessages: NormalizedMessage[]
  siblingToolUseIDs: Set<string>
  tools: Tool[]
  toolUseID: string
  type: 'progress'
  uuid: UUID
}

export type Message = UserMessage | AssistantMessage | ProgressMessage
```

This structure enables tracking of cost, duration, and tool use results while maintaining a clean distinction between message types.

### Tool Use Context

The `ToolUseContext` abstraction encapsulates the environment in which tools operate:

```typescript
export interface ToolUseContext {
  abortController: AbortController
  options: {
    dangerouslySkipPermissions?: boolean
    forkNumber?: number
    messageLogName?: string
    tools: Tool[]
    commands: Command[]
    verbose?: boolean
    slowAndCapableModel?: string
    maxThinkingTokens?: number
  }
  messageId?: string
  readFileTimestamps?: Record<string, number>
}
```

This context provides tools with access to configuration, cancellation capability, and shared state, creating a well-bounded execution environment.

### Command Interface

The `Command` interface defines user-invokable operations:

```typescript
export interface Command {
  name: string
  description: string
  progressMessage?: string
  isEnabled: boolean | (() => boolean | Promise<boolean>)
  isHidden?: boolean
  userFacingName: () => string
  execute: (args: string) => Promise<void>
}
```

This abstraction separates user-level operations from tool-level capabilities, providing a clean interface for command-line interactions.

## Extension Mechanisms

Anon-Kode is designed for extensibility at multiple levels. This section details the mechanisms for extending the system's capabilities.

### Tool Registration and Discovery

New tools are integrated through a modular registration system:

1. **Tool Implementation**: Create a new tool following the Tool interface
2. **Registration**: Add the tool to `getAllTools()` in `tools.ts`
3. **Discovery**: Tools are automatically discovered and made available

This process allows for easy addition of new capabilities without modifying core code.

### MCP Protocol Extension

The Model Context Protocol (MCP) provides a standardized way to extend the system with external tools:

1. **Server Registration**: External tools register as MCP servers
2. **Capability Advertisement**: Servers publish their available tools
3. **Tool Discovery**: The system discovers and integrates external tools
4. **Transparent Use**: External tools appear alongside built-in tools

This mechanism enables third-party extensions without changing the core codebase.

### Command System Extension

The command system can be extended with new slash commands:

1. **Command Implementation**: Create a new command module
2. **Registration**: Add the command to the commands registry
3. **Discovery**: Commands are automatically discovered and made available

This mechanism allows for extending the CLI interface with new capabilities.

### Provider Integration

The model provider system is designed for easy addition of new LLM providers:

1. **Provider Client**: Implement a provider-specific client adapter
2. **Message Format Translation**: Convert between internal and provider formats
3. **Authentication Handling**: Implement provider-specific authentication
4. **Integration**: Connect the provider through the model abstraction layer

This approach has already enabled integration with multiple providers (Anthropic, OpenAI, Bedrock, Vertex).

## Integration Points

The system provides several well-defined integration points for connecting with external systems and workflows.

### File System Integration

Interaction with the local file system occurs through a set of abstraction layers:

1. **File Operation Utilities**: Standardized functions for file operations
2. **Permission Layer**: Security controls for file access
3. **File Tool Implementations**: Tool interfaces for file operations

These integration points ensure secure, controlled access to the local file system.

### Shell Command Integration

Execution of shell commands is mediated through the `BashTool` and supporting utilities:

1. **Command Execution**: Controlled execution in a persistent shell
2. **Output Capture**: Standardized handling of command output
3. **Error Management**: Consistent error handling and reporting

This integration point allows for controlled interaction with the local shell environment.

### External Tool Integration

Beyond MCP, the system provides other integration mechanisms:

1. **Tool Interface Implementation**: Direct implementation of the Tool interface
2. **Service Clients**: Integration with external APIs and services
3. **Protocol Adapters**: Conversion between different communication protocols

These integration points enable connection with a wide range of external systems.

## Permission System Architecture

The permission system is a critical component that ensures user control over AI actions.

### Permission Model

Permissions are structured around several key concepts:

1. **Permission Types**:
   - `FileSystem`: Control over file read/write operations
   - `FileEdit`: Specific control over file modifications
   - `Bash`: Control over command execution
   - Custom types for specialized tools

2. **Permission Scopes**:
   - `Session`: Valid for the current session only
   - `Remember`: Remembered for future sessions
   - `AlwaysAsk`: Always prompt regardless of history

3. **Permission Context**:
   - Tool-specific context (e.g., file paths, command details)
   - User identity and environment
   - Session information

### Permission Request Flow

The permission request process follows a consistent pattern:

1. **Necessity Check**: Determine if permission is needed
2. **Request Formulation**: Create a permission request with context
3. **User Interaction**: Present the request and capture response
4. **Decision Application**: Apply the user's decision
5. **Memory Update**: Update permission memory if remembered

### Permission Storage and Memory

Permission decisions can be remembered through a robust storage system:

1. **Storage Mechanism**: Secure local storage of permission grants
2. **Scoping**: Project-specific vs. global permissions
3. **Validation**: Regular revalidation of remembered permissions
4. **Management**: User interfaces for viewing and revoking permissions

## Error Handling and Recovery Mechanisms

Anon-Kode implements comprehensive error handling to ensure robustness in the face of failures.

### Error Classification

Errors are classified into several categories:

1. **Network Errors**: Connection issues with LLM providers
2. **API Errors**: Errors returned by LLM APIs
3. **Tool Execution Errors**: Failures during tool execution
4. **Validation Errors**: Input validation failures
5. **Permission Errors**: Permission denied by users
6. **System Errors**: Underlying system failures

### Recovery Strategies

Different error types trigger specific recovery strategies:

1. **Automatic Retry**: For transient network and API errors
2. **Graceful Degradation**: Falling back to simpler capabilities
3. **User Guidance**: Providing remediation steps to users
4. **State Preservation**: Saving conversation state for recovery
5. **Logging and Telemetry**: Recording errors for later analysis

### Retry Logic

The system employs sophisticated retry logic for API interactions:

```typescript
async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? MAX_RETRIES
  let lastError: unknown

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation(attempt)
    } catch (error) {
      lastError = error
      // Only retry if the error indicates we should
      if (
        attempt > maxRetries ||
        !(error instanceof APIError) ||
        !shouldRetry(error)
      ) {
        throw error
      }
      // Get retry-after header if available
      const retryAfter = error.headers?.['retry-after'] ?? null
      const delayMs = getRetryDelay(attempt, retryAfter)

      console.log(
        `  ⎿  ${chalk.red(`API ${error.name} (${error.message}) · Retrying in ${Math.round(delayMs / 1000)} seconds… (attempt ${attempt}/${maxRetries})`)}`
      )

      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  throw lastError
}
```

This implements exponential backoff with configurable retry limits and respects retry-after headers.

### Conversation Recovery

To prevent data loss during errors, the system implements conversation recovery:

1. **Session Logging**: Regular logging of conversation state
2. **Crash Detection**: Identification of abnormal termination
3. **Recovery Option**: Offering to resume from last saved state
4. **State Reconstruction**: Rebuilding conversation context

This mechanism ensures that users can recover from system crashes or unexpected errors without losing their work.

## Module Overview

### Core Components

1. **Tool System**:
   - `Tool.ts`: Core tool interface
   - `tools.ts`: Tool registration and discovery
   - `tools/`: Individual tool implementations

2. **Query System**:
   - `query.ts`: Message flow and LLM interaction
   - `messages.ts`: Message data structures
   - `permissions.ts`: Permission handling

3. **Command System**:
   - `commands.ts`: Command registration
   - `commands/`: Individual command implementations

4. **UI Components**:
   - `components/`: React components for UI
   - `screens/`: Full screen UI components
   - `hooks/`: React hooks for UI logic

### Services

1. **Model Integrations**:
   - `services/claude.ts`: Anthropic model integration
   - `services/openai.ts`: OpenAI model integration

2. **MCP Client**:
   - `services/mcpClient.ts`: MCP protocol implementation
   - `services/mcpServerApproval.tsx`: Server approval UI

3. **Authentication and Configuration**:
   - `utils/config.ts`: Configuration management
   - `utils/auth.ts`: Authentication handling

4. **Monitoring and Telemetry**:
   - `services/sentry.ts`: Error tracking
   - `services/statsig.ts`: Usage analytics
   - `cost-tracker.ts`: Cost monitoring

### Utilities

1. **File System**:
   - `utils/file.ts`: File operations
   - `utils/ripgrep.ts`: File search utilities

2. **Terminal**:
   - `utils/terminal.ts`: Terminal interaction
   - `utils/Cursor.ts`: Cursor management

3. **State Management**:
   - `utils/state.ts`: Global state management
   - `utils/sessionState.ts`: Session-specific state

4. **Error Handling**:
   - `utils/errors.ts`: Error classes and utilities
   - `utils/log.ts`: Logging infrastructure

5. **Formatting and Rendering**:
   - `utils/format.tsx`: Text formatting
   - `utils/markdown.ts`: Markdown processing
   - `utils/style.ts`: Terminal styling

This modular organization creates clear separation of concerns while enabling the components to work together seamlessly to provide a cohesive user experience.# Anon-Kode: System Architecture Diagrams

## High-Level Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Terminal UI Layer                         │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ REPL Screen │  │ Message List │  │ Permission Dialogs     │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Command & Message Layer                      │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  Commands   │  │   Messages   │  │ Permission Management  │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Query System Layer                        │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ LLM Query   │  │ Tool Use     │  │ Response Processing    │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Tool System Layer                       │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Built-in    │  │ Agent Tools  │  │ MCP Protocol Tools     │  │
│  │ Tools       │  │              │  │                        │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       External System Layer                      │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ File System │  │ Shell        │  │ MCP Servers            │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Message Processing Pipeline

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ User Input   │───▶│ Normalization│───▶│ System Prompt│
└──────────────┘    └──────────────┘    └──────┬───────┘
                                              │
                                              ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Response     │◀───│ LLM API      │◀───│ Context      │
│ Streaming    │    │ Request      │    │ Injection    │
└──────┬───────┘    └──────────────┘    └──────────────┘
       │
       ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Tool Use     │───▶│ Permission   │───▶│ Tool         │
│ Detection    │    │ Check        │    │ Execution    │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                              │
                                              ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Response     │◀───│ LLM Follow-up│◀───│ Result       │
│ Rendering    │    │ Generation   │    │ Formatting   │
└──────────────┘    └──────────────┘    └──────────────┘
```

## Tool Execution Workflow

```
┌──────────────────────────────────────────────────────────────┐
│                   Tool Execution Workflow                     │
└──────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Tool Use   │     │   Input     │     │  Schema     │
│  Request    │────▶│  Parsing    │────▶│  Validation │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Result     │     │    Tool     │     │ Permission  │
│  Formatting │◀────│  Execution  │◀────│   Check     │
└──────┬──────┘     └─────────────┘     └─────────────┘
       │                    ▲                   ▲
       │                    │                   │
       │            ┌───────┴───────┐  ┌───────┴───────┐
       │            │ Error Handling│  │ User Permission│
       │            └───────────────┘  │    Dialog     │
       │                               └───────────────┘
       ▼
┌─────────────┐
│  Response   │
│  to LLM     │
└─────────────┘
```

## Agent Orchestration Model

```
┌─────────────────────────────────────────────────────────────────┐
│                       Main Conversation                          │
│                                                                 │
│  ┌───────────────┐         ┌───────────────┐                    │
│  │ User Message  │────────▶│    LLM       │                    │
│  └───────────────┘         └───────┬───────┘                    │
│                                   │                             │
│                                   ▼                             │
│  ┌───────────────┐         ┌───────────────┐                    │
│  │  Response     │◀────────│  Agent Tool   │                    │
│  │               │         │    Request    │                    │
│  └───────────────┘         └───────┬───────┘                    │
└───────────────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Agent Environment                         │
│                                                                 │
│  ┌───────────────┐         ┌───────────────┐                    │
│  │  Agent Prompt │────────▶│ Agent LLM    │                    │
│  └───────────────┘         └───────┬───────┘                    │
│                                   │                             │
│                                   ▼                             │
│  ┌───────────────┐         ┌───────────────┐                    │
│  │ Tool Results  │◀────────│  Tool Use     │                    │
│  └───────┬───────┘         └───────────────┘                    │
│          │                                                      │
│          │            ┌───────────────┐                         │
│          └───────────▶│ Agent LLM     │                         │
│                       │ Follow-up     │                         │
│                       └───────┬───────┘                         │
└───────────────────────────────┬─────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Main Conversation                          │
│                                                                 │
│  ┌───────────────┐                                              │
│  │  Final Agent  │                                              │
│  │  Result       │                                              │
│  └───────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘
```

## MCP Integration Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      Anon-Kode System                         │
│                                                                │
│  ┌──────────────┐     ┌──────────────┐    ┌──────────────┐    │
│  │  Tool System │────▶│  MCP Client  │───▶│  Tool Use    │    │
│  └──────────────┘     └──────┬───────┘    └──────────────┘    │
│                             │                                  │
└─────────────────────────────┼──────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                        MCP Protocol                             │
│                                                                │
│   ┌───────────────────────────────────────────────────────┐    │
│   │         JSON-RPC over stdio or SSE transport          │    │
│   └───────────────────────────────────────────────────────┘    │
│                                                                │
└────────────────────────────┬───────────────────────────────────┘
                             │
           ┌─────────────────┼────────────────────┐
           │                 │                    │
           ▼                 ▼                    ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────┐
│  Local MCP      │ │  Remote MCP     │ │  Repository MCP     │
│  Server         │ │  Server         │ │  Server (.mcprc)    │
│                 │ │                 │ │                     │
│  ┌───────────┐  │ │  ┌───────────┐  │ │  ┌───────────┐     │
│  │ Tools API │  │ │  │ Tools API │  │ │  │ Tools API │     │
│  └───────────┘  │ │  └───────────┘  │ │  └───────────┘     │
└─────────────────┘ └─────────────────┘ └─────────────────────┘
```

## Permission System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Permission System                     │
└────────────────────────────────────────────────────────┘

                  ┌─────────────────┐
                  │   Tool Call     │
                  └────────┬────────┘
                           │
                           ▼
           ┌─────────────────────────────┐
           │  Permission Required Check   │
           └───────────┬─────────────────┘
                       │
                       ▼
              ┌──────────────┐    No     ┌─────────────┐
              │ Permission   │───────────▶│ Execute Tool│
              │ Required?    │            └─────────────┘
              └──────┬───────┘
                     │ Yes
                     ▼
┌───────────────────────────────────────┐
│          Permission Memory             │
│                                        │
│  ┌────────────┐    ┌────────────────┐  │
│  │ Session    │    │ Remembered     │  │
│  │ Permissions│    │ Permissions    │  │
│  └────────────┘    └────────────────┘  │
└─────────────┬─────────────────────┬────┘
              │                     │
              ▼                     ▼
    ┌──────────────────┐   ┌─────────────────┐
    │  Permission      │   │  Permission     │
    │  Already Granted?│   │  Already Denied?│
    └───────┬──────────┘   └────────┬────────┘
            │                       │
            │                       │
          No│                      │Yes
            │                       │
            ▼                       ▼
┌────────────────────────┐  ┌───────────────────┐
│ Show Permission Dialog │  │ Permission Denied │
└──────────┬─────────────┘  └───────────────────┘
           │
           ▼
┌─────────────────────────┐
│    User Decision        │
└────────────┬────────────┘
             │
             ▼
  ┌───────────────────────┐
  │ Remember Decision?    │
  └─────────┬─────────────┘
            │
            ▼
┌──────────────────────────────┐
│ Update Permission Memory     │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│ Return Permission Result     │
└──────────────────────────────┘
```