import { existsSync, mkdirSync, appendFileSync } from 'fs';
import path from 'path';
import { homedir } from 'os';
import { getGlobalConfig } from './config.js';
import { SESSION_ID } from './log.js';
import { getCwd } from './state.js';

// Import types from the dedicated types module
import {
  LoggedItem,
  ToolCall,
  UserMessage,
  AssistantMessage,
  CommandExecution,
  ForkEvent,
  ContextChange
} from '../types/logs/index.js';

// Re-export types for backward compatibility
export type {
  LoggedItem,
  ToolCall,
  UserMessage,
  AssistantMessage,
  CommandExecution,
  ForkEvent,
  ContextChange
};

// Class for managing session logs
export class SessionLogger {
  private static instance: SessionLogger;
  private logFile: string | null = null;
  private enabled: boolean = false;
  private seenMessageIds = new Set<string>();
  private lastForkId: number = 0;
  private toolCallStatusMap = new Map<string, ToolCall>();

  private constructor() {
    // Don't initialize immediately in the constructor
    // Initialization will happen lazily when needed
  }

  public static getInstance(): SessionLogger {
    if (!SessionLogger.instance) {
      SessionLogger.instance = new SessionLogger();
    }
    return SessionLogger.instance;
  }

  // Lazy initialization
  private ensureInitialized(): void {
    if (this.logFile === null) {
      this.initialize();
    }
  }

  // Initialize logger based on config
  private initialize(): void {
    const config = getGlobalConfig();
    this.enabled = config.enableSessionLogging ?? false;
    const loggingMode = config.sessionLoggingMode ?? 'formatted';
    
    // Only enable formatted logging if mode is 'formatted' or 'both'
    if (this.enabled && (loggingMode === 'formatted' || loggingMode === 'both')) {
      const logDirectory = this.resolveLogPath(config.sessionLogPath ?? '.KODING-LOGS');
      
      // Create directory if it doesn't exist
      if (!existsSync(logDirectory)) {
        try {
          mkdirSync(logDirectory, { recursive: true });
        } catch (err) {
          console.error(`Failed to create log directory: ${err}`);
          this.enabled = false;
          return;
        }
      }
      
      // Create log file with timestamp and mode
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
      this.logFile = path.join(logDirectory, `session-${timestamp}-${SESSION_ID}-formatted.log`);
      
      // Write log header
      this.writeToLog({
        timestamp: this.getCurrentTimestamp(),
        type: 'session_start',
        content: {
          session_id: SESSION_ID,
          start_time: timestamp,
          platform: process.platform,
          node_version: process.version,
          logging_mode: loggingMode
        }
      });
    } else if (this.enabled && loggingMode === 'raw') {
      // If only raw logging is enabled, disable the formatted logger
      this.enabled = false;
    }
  }

  // Resolve relative or user-home paths
  private resolveLogPath(logPath: string): string {
    if (logPath.startsWith('~')) {
      return path.join(homedir(), logPath.substring(1));
    }
    if (path.isAbsolute(logPath)) {
      return logPath;
    }
    return path.resolve(getCwd(), logPath);
  }

  // Get current timestamp in ISO format with UTC timezone
  private getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  // Write log entry to file
  private writeToLog(data: any): void {
    if (!this.enabled || !this.logFile) return;
    
    try {
      // Prettify newlines for better readability
      const formattedData = JSON.stringify(data, (key, value) => {
        if (typeof value === 'string') {
          return value.replace(/\\n/g, '\n');
        }
        return value;
      }, 2);
      
      appendFileSync(this.logFile, `${formattedData}\n`);
    } catch (err) {
      console.error(`Failed to write to log file: ${err}`);
    }
  }

  // Check if message has been logged already to avoid duplicates
  private isDuplicate(id: string): boolean {
    if (this.seenMessageIds.has(id)) {
      return true;
    }
    this.seenMessageIds.add(id);
    return false;
  }

  // Log user message
  public logUserMessage(id: string, text: string): void {
    this.ensureInitialized();
    if (!this.enabled || this.isDuplicate(id)) return;
    
    this.writeToLog({
      timestamp: this.getCurrentTimestamp(),
      type: 'user_message',
      id,
      content: {
        text: this.formatMessageText(text)
      }
    });
  }

  // Log assistant response
  public logAssistantMessage(id: string, model: string, content: string | any[]): void {
    this.ensureInitialized();
    if (!this.enabled || this.isDuplicate(id)) return;
    
    this.writeToLog({
      timestamp: this.getCurrentTimestamp(),
      type: 'assistant_message',
      id,
      model,
      content: {
        text: this.formatMessageText(content)
      }
    });
  }

  // Log tool call request
  public logToolCallRequest(id: string, tool: string, input: any): void {
    this.ensureInitialized();
    if (!this.enabled) return;
    
    const toolCall: ToolCall = {
      timestamp: this.getCurrentTimestamp(),
      type: 'tool_call',
      id,
      tool,
      input,
      status: 'pending',
      content: {
        action: 'request',
        tool,
        input
      }
    };
    
    this.toolCallStatusMap.set(id, toolCall);
    this.writeToLog(toolCall);
  }

  // Log tool call result
  public logToolCallResult(id: string, output: any, status: 'success' | 'error' | 'canceled'): void {
    this.ensureInitialized();
    if (!this.enabled) return;
    
    const toolCall = this.toolCallStatusMap.get(id);
    if (toolCall) {
      toolCall.status = status;
      toolCall.output = output;
      
      this.writeToLog({
        timestamp: this.getCurrentTimestamp(),
        type: 'tool_call',
        id,
        tool: toolCall.tool,
        content: {
          action: 'result',
          output,
          status
        }
      });
    }
  }

  // Log command execution
  public logCommand(command: string, args?: any): void {
    this.ensureInitialized();
    if (!this.enabled) return;
    
    this.writeToLog({
      timestamp: this.getCurrentTimestamp(),
      type: 'command',
      content: {
        command,
        args
      }
    });
  }

  // Log conversation fork
  public logFork(newForkId: number, reason: string): void {
    this.ensureInitialized();
    if (!this.enabled) return;
    this.lastForkId = newForkId;
    
    this.writeToLog({
      timestamp: this.getCurrentTimestamp(),
      type: 'fork',
      content: {
        new_fork_id: newForkId,
        reason
      }
    });
  }

  // Log conversation clear or compact
  public logContextChange(action: 'clear' | 'compact', summary?: string): void {
    this.ensureInitialized();
    if (!this.enabled) return;
    
    this.writeToLog({
      timestamp: this.getCurrentTimestamp(),
      type: 'context_change',
      content: {
        action,
        summary: summary ? this.formatMessageText(summary) : undefined
      }
    });
  }

  // Format message text for better readability in logs
  private formatMessageText(text: string | any[]): string | any[] {
    if (typeof text === 'string') {
      // Replace escaped newlines with actual newlines
      return text.replace(/\\n/g, '\n');
    }
    
    if (Array.isArray(text)) {
      // Format each block in the array
      return text.map(block => {
        if (typeof block === 'string') {
          return block.replace(/\\n/g, '\n');
        }
        if (block && typeof block === 'object' && block.text) {
          return {
            ...block,
            text: block.text.replace(/\\n/g, '\n')
          };
        }
        return block;
      });
    }
    
    return text;
  }

  // Enable or disable logging
  public setEnabled(enabled: boolean): void {
    this.ensureInitialized();
    if (this.enabled !== enabled) {
      this.enabled = enabled;
      if (enabled && !this.logFile) {
        this.initialize();
      }
    }
  }

  // Get current fork ID
  public getCurrentForkId(): number {
    this.ensureInitialized();
    return this.lastForkId;
  }
}

// RawLogger class for storing unformatted API requests and responses
export class RawLogger {
  private static instance: RawLogger;
  private logFile: string | null = null;
  private enabled: boolean = false;
  private loggingMode: string = 'formatted';
  // Buffer to store stream chunks by request ID
  private streamChunkBuffers: Map<string, any[]> = new Map();

  private constructor() {
    // Don't initialize immediately in the constructor
    // Initialization will happen lazily when needed
  }

  public static getInstance(): RawLogger {
    if (!RawLogger.instance) {
      RawLogger.instance = new RawLogger();
    }
    return RawLogger.instance;
  }

  // Lazy initialization
  private ensureInitialized(): void {
    if (this.logFile === null) {
      this.initialize();
    }
  }

  // Initialize logger based on config
  private initialize(): void {
    const config = getGlobalConfig();
    this.enabled = config.enableSessionLogging ?? false;
    this.loggingMode = config.sessionLoggingMode ?? 'formatted';
    
    // Only enable if mode is 'raw' or 'both'
    if (this.enabled && (this.loggingMode === 'raw' || this.loggingMode === 'both')) {
      const logDirectory = this.resolveLogPath(config.sessionLogPath ?? '.KODING-LOGS');
      
      // Create directory if it doesn't exist
      if (!existsSync(logDirectory)) {
        try {
          mkdirSync(logDirectory, { recursive: true });
        } catch (err) {
          console.error(`Failed to create log directory: ${err}`);
          this.enabled = false;
          return;
        }
      }
      
      // Create log file with timestamp and mode
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
      this.logFile = path.join(logDirectory, `session-${timestamp}-${SESSION_ID}-raw.log`);
    }
  }

  // Resolve relative or user-home paths
  private resolveLogPath(logPath: string): string {
    if (logPath.startsWith('~')) {
      return path.join(homedir(), logPath.substring(1));
    }
    if (path.isAbsolute(logPath)) {
      return logPath;
    }
    return path.resolve(getCwd(), logPath);
  }

  // Get current timestamp in ISO format with UTC timezone
  private getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  // Redact sensitive information from requests
  private redactSensitiveInfo(data: any): any {
    if (!data) return data;
    
    // Deep clone to avoid modifying the original object
    const redacted = JSON.parse(JSON.stringify(data));
    
    // Redact API keys in headers
    if (redacted.headers) {
      if (redacted.headers.Authorization) {
        redacted.headers.Authorization = 'Bearer [REDACTED]';
      }
      if (redacted.headers['x-api-key']) {
        redacted.headers['x-api-key'] = '[REDACTED]';
      }
    }
    
    return redacted;
  }

  // Write raw log entry to file
  private writeToLog(data: any): void {
    this.ensureInitialized();
    if (!this.enabled || !this.logFile) return;
    
    try {
      // Use JSON.stringify with null replacer to avoid any formatting changes
      // Add a custom replacer to handle potentially circular references
      const seen = new WeakSet();
      const rawData = JSON.stringify(data, (key, value) => {
        // Skip functions
        if (typeof value === 'function') {
          return undefined;
        }
        // Handle circular references
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        return value;
      });
      
      appendFileSync(this.logFile, `${rawData}\n`);
    } catch (err) {
      console.error(`Failed to write to raw log file: ${err}`);
    }
  }

  // Log API request
  public logApiRequest(provider: string, requestId: string, endpoint: string, method: string, headers: any, body: any): void {
    this.ensureInitialized();
    if (!this.enabled) return;
    
    // Clear any existing buffer for this request ID (in case of retries)
    this.streamChunkBuffers.delete(requestId);
    
    // Extract baseURL from endpoint if available
    let baseURL = '';
    try {
      const endpointUrl = new URL(endpoint);
      baseURL = `${endpointUrl.protocol}//${endpointUrl.host}`;
    } catch (e) {
      // If endpoint is not a valid URL, try to get it from headers
      baseURL = headers['X-Base-URL'] || '';
    }

    this.writeToLog({
      timestamp: this.getCurrentTimestamp(),
      type: 'api_request',
      provider, // Protocol (openai, anthropic)
      baseURL,  // Actual endpoint base URL
      request_id: requestId,
      data: {
        endpoint,
        method,
        headers: this.redactSensitiveInfo({ headers }).headers,
        body
      }
    });
  }

  // Log API response
  public logApiResponse(provider: string, requestId: string, status: number, headers: any, body: any, durationMs: number): void {
    this.ensureInitialized();
    if (!this.enabled) return;
    
    this.writeToLog({
      timestamp: this.getCurrentTimestamp(),
      type: 'api_response',
      provider,
      request_id: requestId,
      data: {
        status,
        headers,
        body,
        duration_ms: durationMs
      }
    });
    
    // Clean up any buffered chunks that weren't flushed
    this.streamChunkBuffers.delete(requestId);
  }

  // Log API error
  public logApiError(provider: string, requestId: string, error: any, durationMs: number): void {
    this.ensureInitialized();
    if (!this.enabled) return;
    
    // Extract baseURL from error if available
    let baseURL = '';
    if (error && typeof error === 'object') {
      baseURL = error.baseURL || '';
      
      // Include the full error object for better debugging
      if (error.endpoint) {
        try {
          const endpointUrl = new URL(error.endpoint);
          if (!baseURL) {
            baseURL = `${endpointUrl.protocol}//${endpointUrl.host}`;
          }
        } catch (e) {
          // Ignore URL parsing errors
        }
      }
    }

    this.writeToLog({
      timestamp: this.getCurrentTimestamp(),
      type: 'api_error',
      provider,
      baseURL,  // Include actual endpoint
      request_id: requestId,
      data: {
        error: error instanceof Error ? error.message : String(error),
        baseURL: baseURL, // Include baseURL in data for clarity
        endpoint: error.endpoint || '',
        stack: error instanceof Error ? error.stack : undefined,
        duration_ms: durationMs,
        details: error  // Include full error details
      }
    });
    
    // Clean up any buffered chunks for this request
    this.streamChunkBuffers.delete(requestId);
  }

  // Buffer API stream chunk (don't log immediately)
  public logApiStreamChunk(provider: string, requestId: string, chunk: any, index: number): void {
    this.ensureInitialized();
    if (!this.enabled) return;
    
    // Create buffer for this request if it doesn't exist
    if (!this.streamChunkBuffers.has(requestId)) {
      // Create a new buffer without logging to console
      this.streamChunkBuffers.set(requestId, []);
    }
    
    // Add chunk to buffer - making a copy to avoid circular references
    const buffer = this.streamChunkBuffers.get(requestId);
    if (buffer) {
      try {
        // Safely serialize and deserialize to avoid circular references
        const safeChunk = JSON.parse(JSON.stringify(chunk, (key, value) => {
          // Skip functions and circular references
          if (typeof value === 'function') {
            return undefined;
          }
          return value;
        }));
        
        buffer.push({
          timestamp: this.getCurrentTimestamp(),
          index,
          data: safeChunk
        });
        
        // No debug logging to console to avoid cluttering the CLI
      } catch (err) {
        // Only log errors, not debug info
        console.error(`Failed to buffer stream chunk for ${requestId}:`, err);
      }
    }
  }
  
  // Log when a stream connection is initiated
  public logApiStreamStart(provider: string, requestId: string): void {
    this.ensureInitialized();
    if (!this.enabled) return;
    
    this.writeToLog({
      timestamp: this.getCurrentTimestamp(),
      type: 'api_stream_start',
      provider,
      request_id: requestId,
      data: {
        status: 'connected'
      }
    });
    
    // Initialize an empty buffer for this stream's chunks
    this.streamChunkBuffers.set(requestId, []);
  }
  
  // Log all buffered stream chunks as one entry
  public logApiStreamComplete(provider: string, requestId: string): void {
    this.ensureInitialized();
    if (!this.enabled) return;
    
    // Check if we have any buffered chunks for this request
    const buffer = this.streamChunkBuffers.get(requestId);
    if (!buffer || buffer.length === 0) {
      return;
    }
    
    try {
      // Log all chunks as a single entry
      this.writeToLog({
        timestamp: this.getCurrentTimestamp(),
        type: 'api_stream_chunks',
        provider,
        request_id: requestId,
        chunk_count: buffer.length,
        chunks: buffer
      });
    } catch (err) {
      console.error(`Failed to write stream chunks to log for ${requestId}:`, err);
    } finally {
      // Always clean up buffer
      this.streamChunkBuffers.delete(requestId);
    }
  }
}

// Lazy singleton exports
// This approach allows the singleton instances to be created on-demand
// while maintaining the same interface for importing code
export const sessionLogger = {
  // Pass through all methods of SessionLogger
  logUserMessage: (...args: Parameters<SessionLogger['logUserMessage']>) => 
    SessionLogger.getInstance().logUserMessage(...args),
  logAssistantMessage: (...args: Parameters<SessionLogger['logAssistantMessage']>) => 
    SessionLogger.getInstance().logAssistantMessage(...args),
  logToolCallRequest: (...args: Parameters<SessionLogger['logToolCallRequest']>) => 
    SessionLogger.getInstance().logToolCallRequest(...args),
  logToolCallResult: (...args: Parameters<SessionLogger['logToolCallResult']>) => 
    SessionLogger.getInstance().logToolCallResult(...args),
  logCommand: (...args: Parameters<SessionLogger['logCommand']>) => 
    SessionLogger.getInstance().logCommand(...args),
  logFork: (...args: Parameters<SessionLogger['logFork']>) => 
    SessionLogger.getInstance().logFork(...args),
  logContextChange: (...args: Parameters<SessionLogger['logContextChange']>) => 
    SessionLogger.getInstance().logContextChange(...args),
  setEnabled: (...args: Parameters<SessionLogger['setEnabled']>) => 
    SessionLogger.getInstance().setEnabled(...args),
  getCurrentForkId: (...args: Parameters<SessionLogger['getCurrentForkId']>) => 
    SessionLogger.getInstance().getCurrentForkId(...args),
};

export const rawLogger = {
  // Pass through all methods of RawLogger
  logApiRequest: (...args: Parameters<RawLogger['logApiRequest']>) => 
    RawLogger.getInstance().logApiRequest(...args),
  logApiResponse: (...args: Parameters<RawLogger['logApiResponse']>) => 
    RawLogger.getInstance().logApiResponse(...args),
  logApiError: (...args: Parameters<RawLogger['logApiError']>) => 
    RawLogger.getInstance().logApiError(...args),
  logApiStreamStart: (...args: Parameters<RawLogger['logApiStreamStart']>) => 
    RawLogger.getInstance().logApiStreamStart(...args),
  logApiStreamChunk: (...args: Parameters<RawLogger['logApiStreamChunk']>) => 
    RawLogger.getInstance().logApiStreamChunk(...args),
  logApiStreamComplete: (...args: Parameters<RawLogger['logApiStreamComplete']>) => 
    RawLogger.getInstance().logApiStreamComplete(...args),
};