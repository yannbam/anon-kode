import { existsSync, mkdirSync, appendFileSync } from 'fs';
import path from 'path';
import { homedir } from 'os';
import { getGlobalConfig } from './config.js';
import { SESSION_ID } from './log.js';
import { getCwd } from './state.js';

// Type definitions for message items
export interface LoggedItem {
  timestamp: string;
  type: string;
  model?: string;
  content: any;
}

export interface ToolCall extends LoggedItem {
  tool: string;
  input: any;
  output?: any;
  status: 'pending' | 'success' | 'error' | 'canceled';
}

export interface UserMessage extends LoggedItem {
  text: string;
}

export interface AssistantMessage extends LoggedItem {
  text: string | any[];
}

export interface CommandExecution extends LoggedItem {
  command: string;
  args?: any;
}

export interface ForkEvent extends LoggedItem {
  newForkId: number;
  reason: string;
}

export interface ContextChange extends LoggedItem {
  action: 'clear' | 'compact';
  summary?: string;
}

// Class for managing session logs
export class SessionLogger {
  private static instance: SessionLogger;
  private logFile: string | null = null;
  private enabled: boolean = false;
  private seenMessageIds = new Set<string>();
  private lastForkId: number = 0;
  private toolCallStatusMap = new Map<string, ToolCall>();

  private constructor() {
    this.initialize();
  }

  public static getInstance(): SessionLogger {
    if (!SessionLogger.instance) {
      SessionLogger.instance = new SessionLogger();
    }
    return SessionLogger.instance;
  }

  // Initialize logger based on config
  private initialize(): void {
    const config = getGlobalConfig();
    this.enabled = config.enableSessionLogging ?? false;
    
    if (this.enabled) {
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
      const loggingMode = config.sessionLoggingMode ?? 'formatted';
      this.logFile = path.join(logDirectory, `session-${timestamp}-${SESSION_ID}-${loggingMode}.log`);
      
      // Write log header
      this.writeToLog({
        timestamp: this.getCurrentTimestamp(),
        type: 'session_start',
        content: {
          session_id: SESSION_ID,
          start_time: timestamp,
          platform: process.platform,
          node_version: process.version,
          logging_mode: config.sessionLoggingMode ?? 'formatted'
        }
      });
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
    if (this.enabled !== enabled) {
      this.enabled = enabled;
      if (enabled && !this.logFile) {
        this.initialize();
      }
    }
  }

  // Get current fork ID
  public getCurrentForkId(): number {
    return this.lastForkId;
  }
}

// Singleton export
export const sessionLogger = SessionLogger.getInstance();