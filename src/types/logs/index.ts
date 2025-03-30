// Types for logging system
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

// Add missing types
export interface LogOption {
  enabled: boolean;
  mode: 'formatted' | 'raw' | 'both';
  path: string;
}

export interface SerializedMessage {
  id: string;
  content: any;
  // Add other properties as needed
}
