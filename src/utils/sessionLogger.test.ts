import { existsSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { SessionLogger } from './sessionLogger';

// Mock the required dependencies
vi.mock('./config', () => ({
  getGlobalConfig: vi.fn(() => ({
    enableSessionLogging: true,
    sessionLogPath: './.test-logs'
  }))
}));

vi.mock('./log', () => ({
  SESSION_ID: 'test-session-id'
}));

const TEST_DIR = './.test-logs';

describe('SessionLogger', () => {
  beforeEach(() => {
    // Create test directory if it doesn't exist
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory after tests
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should create log directory if it does not exist', () => {
    // Import the singleton after mocks are set up
    const { SessionLogger } = require('./sessionLogger');
    
    // Get the instance (should initialize with our mocked config)
    const logger = SessionLogger.getInstance();
    
    // Force the logger to initialize (normally done in constructor)
    (logger as any).initialize();
    
    // Should create the directory
    expect(existsSync(TEST_DIR)).toBe(true);
  });

  it('should log user messages with correct format', () => {
    // Import the singleton after mocks are set up
    const { SessionLogger } = require('./sessionLogger');
    
    // Spy on the writeToLog method
    const logger = SessionLogger.getInstance();
    const writeToLogSpy = vi.spyOn(logger as any, 'writeToLog');
    
    // Log a user message
    logger.logUserMessage('test-id', 'Hello world');
    
    // Check if writeToLog was called with correct parameters
    expect(writeToLogSpy).toHaveBeenCalledTimes(1);
    expect(writeToLogSpy.mock.calls[0][0].type).toBe('user_message');
    expect(writeToLogSpy.mock.calls[0][0].id).toBe('test-id');
    expect(writeToLogSpy.mock.calls[0][0].content.text).toBe('Hello world');
  });

  it('should deduplicate messages with the same ID', () => {
    // Import the singleton after mocks are set up
    const { SessionLogger } = require('./sessionLogger');
    
    // Spy on the writeToLog method
    const logger = SessionLogger.getInstance();
    const writeToLogSpy = vi.spyOn(logger as any, 'writeToLog');
    
    // Reset the tracking
    (logger as any).seenMessageIds = new Set();
    
    // Log the same message twice
    logger.logUserMessage('duplicate-id', 'First message');
    logger.logUserMessage('duplicate-id', 'Second message with same ID');
    
    // Should only log the first one
    expect(writeToLogSpy).toHaveBeenCalledTimes(1);
    expect(writeToLogSpy.mock.calls[0][0].content.text).toBe('First message');
  });

  it('should track tool call status', () => {
    // Import the singleton after mocks are set up
    const { SessionLogger } = require('./sessionLogger');
    
    // Get the instance
    const logger = SessionLogger.getInstance();
    const writeToLogSpy = vi.spyOn(logger as any, 'writeToLog');
    
    // Reset call count
    writeToLogSpy.mockReset();
    
    // Log a tool call and its result
    logger.logToolCallRequest('tool-id', 'TestTool', { param: 'value' });
    logger.logToolCallResult('tool-id', { result: 'success' }, 'success');
    
    // Should log both the request and the result
    expect(writeToLogSpy).toHaveBeenCalledTimes(2);
    expect(writeToLogSpy.mock.calls[0][0].type).toBe('tool_call');
    expect(writeToLogSpy.mock.calls[0][0].content.action).toBe('request');
    expect(writeToLogSpy.mock.calls[1][0].type).toBe('tool_call');
    expect(writeToLogSpy.mock.calls[1][0].content.action).toBe('result');
  });
});