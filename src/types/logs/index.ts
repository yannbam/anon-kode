// Types for logging system
export interface LoggedItem {
  timestamp: string;
  type: string;
  model?: string;
  content: any;
}

export interface ToolCall extends LoggedItem {
  id?: string;
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
  // Basic logging configuration
  enabled: boolean;
  mode: 'formatted' | 'raw' | 'both';
  path: string;
  
  // Optional properties used in various components
  value?: number;
  date?: string;
  fullPath?: string;
  messages?: SerializedMessage[];
  created?: Date;
  modified?: Date;
  firstPrompt?: string;
  messageCount?: number;
  forkNumber?: number;
  sidechainNumber?: number;
}

export interface LogListProps {
  logs: LogOption[];
  onSelect: (log: LogOption) => void;
  onClose: () => void;
  context?: { unmount?: () => void; };
}

export interface SerializedMessage {
  id: string;
  content: any;
  type: string;
  message?: any;
  timestamp: string;
  // Other common properties
  model?: string;
  tool?: string;
  input?: any;
  output?: any;
  status?: string;
}
