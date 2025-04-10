import '@anthropic-ai/sdk/shims/node'
import Anthropic, { APIConnectionError, APIError } from '@anthropic-ai/sdk'
import { AnthropicBedrock } from '@anthropic-ai/bedrock-sdk'
import { AnthropicVertex } from '@anthropic-ai/vertex-sdk'
import { sessionLogger, rawLogger } from '../utils/sessionLogger.js'

// Extended interfaces to match Anthropic implementation
interface ExtendedAnthropicBedrock extends AnthropicBedrock {
  apiKey?: string;
  authToken?: string;
  models?: any;
  apiKeyAuth?: any;
  bearerAuth?: any;
}

interface ExtendedAnthropicVertex extends AnthropicVertex {
  apiKey?: string;
  authToken?: string;
  completions?: any;
  models?: any;
  apiKeyAuth?: any;
  bearerAuth?: any;
}
import type { BetaUsage } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import chalk from 'chalk'
import { createHash, randomUUID } from 'crypto'
import 'dotenv/config'

import { addToTotalCost } from '../cost-tracker'
import type { AssistantMessage, UserMessage } from '../query'
import { Tool } from '../Tool'
import { getAnthropicApiKey, getOrCreateUserID, getGlobalConfig, getActiveApiKey, markApiKeyAsFailed } from '../utils/config'
import { logError, SESSION_ID } from '../utils/log'
import { USER_AGENT } from '../utils/http'
import { setSessionState } from '../utils/sessionState'
import {
  createAssistantAPIErrorMessage,
  normalizeContentFromAPI,
} from '../utils/messages.js'
import { countTokens } from '../utils/tokens'
import { logEvent } from './statsig'
import { withVCR } from './vcr'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { BetaMessageStream } from '@anthropic-ai/sdk/lib/BetaMessageStream.mjs'
import type {
  Message as APIMessage,
  MessageParam,
  TextBlockParam,
} from '@anthropic-ai/sdk/resources/index.mjs'
import { SMALL_FAST_MODEL, getSmallFastModel, USE_BEDROCK, USE_VERTEX } from '../utils/model'
import { getCLISyspromptPrefix } from '../constants/prompts'
import { getVertexRegionForModel } from '../utils/model'
import OpenAI from 'openai'
import type { ChatCompletionStream } from 'openai/lib/ChatCompletionStream'

// Extend ChatCompletionMessage with additional properties from different providers
interface ExtendedChatCompletionMessage extends OpenAI.ChatCompletionMessage {
  reasoning?: string;
  reasoning_content?: string;
}
import { ContentBlock } from '@anthropic-ai/sdk/resources/messages/messages'
import { nanoid } from 'nanoid'
import { getCompletion } from './openai'
import { getReasoningEffort } from '../utils/thinking'


interface StreamResponse extends APIMessage {
  ttftMs?: number;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  content?: Array<any>;
  stop_reason?: string | null;
}

export const API_ERROR_MESSAGE_PREFIX = 'API Error'
export const PROMPT_TOO_LONG_ERROR_MESSAGE = 'Prompt is too long'
export const CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE = 'Credit balance is too low'
export const INVALID_API_KEY_ERROR_MESSAGE =
  'Invalid API key · Please run /login'
export const NO_CONTENT_MESSAGE = '(no content)'
const PROMPT_CACHING_ENABLED = !process.env.DISABLE_PROMPT_CACHING

// @see https://docs.anthropic.com/en/docs/about-claude/models#model-comparison-table
const HAIKU_COST_PER_MILLION_INPUT_TOKENS = 0.8
const HAIKU_COST_PER_MILLION_OUTPUT_TOKENS = 4
const HAIKU_COST_PER_MILLION_PROMPT_CACHE_WRITE_TOKENS = 1
const HAIKU_COST_PER_MILLION_PROMPT_CACHE_READ_TOKENS = 0.08

const SONNET_COST_PER_MILLION_INPUT_TOKENS = 3
const SONNET_COST_PER_MILLION_OUTPUT_TOKENS = 15
const SONNET_COST_PER_MILLION_PROMPT_CACHE_WRITE_TOKENS = 3.75
const SONNET_COST_PER_MILLION_PROMPT_CACHE_READ_TOKENS = 0.3

export const MAIN_QUERY_TEMPERATURE = 1 // to get more variation for binary feedback

function getMetadata() {
  return {
    user_id: `${getOrCreateUserID()}_${SESSION_ID}`,
  }
}

const MAX_RETRIES = process.env.USER_TYPE === 'SWE_BENCH' ? 100 : 10
const BASE_DELAY_MS = 500

interface RetryOptions {
  maxRetries?: number
}

function getRetryDelay(
  attempt: number,
  retryAfterHeader?: string | null,
): number {
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10)
    if (!isNaN(seconds)) {
      return seconds * 1000
    }
  }
  return Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), 32000) // Max 32s delay
}

function shouldRetry(error: APIError): boolean {
  // Check for overloaded errors first and only retry for SWE_BENCH
  if (error.message?.includes('"type":"overloaded_error"')) {
    return process.env.USER_TYPE === 'SWE_BENCH'
  }

  // Note this is not a standard header.
  const shouldRetryHeader = error.headers?.['x-should-retry']

  // If the server explicitly says whether or not to retry, obey.
  if (shouldRetryHeader === 'true') return true
  if (shouldRetryHeader === 'false') return false

  if (error instanceof APIConnectionError) {
    return true
  }

  if (!error.status) return false

  // Retry on request timeouts.
  if (error.status === 408) return true

  // Retry on lock timeouts.
  if (error.status === 409) return true

  // Retry on rate limits.
  if (error.status === 429) return true

  // Retry internal errors.
  if (error.status && error.status >= 500) return true

  return false
}

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
        `  ⎿  ${chalk.red(`API ${error.name} (${error.message}) · Retrying in ${Math.round(delayMs / 1000)} seconds… (attempt ${attempt}/${maxRetries})`)}`,
      )

      logEvent('tengu_api_retry', {
        attempt: String(attempt),
        delayMs: String(delayMs),
        error: error.message,
        status: String(error.status),
        provider: USE_BEDROCK ? 'bedrock' : USE_VERTEX ? 'vertex' : '1p',
      })

      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  throw lastError
}

export async function verifyApiKey(apiKey: string): Promise<boolean> {
  const anthropic = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
    maxRetries: 3,
    defaultHeaders: {
      'User-Agent': USER_AGENT,
    },
  })

  try {
    await withRetry(
      async () => {
        const model = SMALL_FAST_MODEL
        const messages: MessageParam[] = [{ role: 'user', content: 'test' }]
        await anthropic.messages.create({
          model,
          max_tokens: 1,
          messages,
          temperature: 0,
          metadata: getMetadata(),
        })
        return true
      },
      { maxRetries: 2 }, // Use fewer retries for API key verification
    )
    return true
  } catch (error) {
    logError(error)
    // Check for authentication error
    if (
      error instanceof Error &&
      error.message.includes(
        '{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}',
      )
    ) {
      return false
    }
    throw error
  }
}

function convertAnthropicMessagesToOpenAIMessages(messages: (UserMessage | AssistantMessage)[]): (OpenAI.ChatCompletionMessageParam | OpenAI.ChatCompletionToolMessageParam)[] {
  const openaiMessages: (OpenAI.ChatCompletionMessageParam | OpenAI.ChatCompletionToolMessageParam)[] = []
  
  const toolResults: Record<string, OpenAI.ChatCompletionToolMessageParam> = {}

  for (const message of messages) {
    let contentBlocks = []
    if (typeof message.message.content === 'string') {
      contentBlocks = [{
        type: 'text',
        text: message.message.content,
      }]
    } else if (!Array.isArray(message.message.content)) {
      contentBlocks = [message.message.content]
    } else {
      contentBlocks = message.message.content
    }

    for (const block of contentBlocks) {
      if(block.type === 'text') {
          openaiMessages.push({
            role: message.message.role,
            content: block.text,
          })
      } else if(block.type === 'tool_use') {
          openaiMessages.push({
            role: 'assistant',
            content: undefined,
            tool_calls: [{
              type: 'function',
              function: {
                name: block.name,
                arguments: JSON.stringify(block.input),
              },
              id: block.id,
            }],
          })
      } if(block.type === 'tool_result') {
        toolResults[block.tool_use_id] = {
          role: 'tool',
          content: block.content,
          tool_call_id: block.tool_use_id,
        }
      }
    }
  }

  const finalMessages: (OpenAI.ChatCompletionMessageParam | OpenAI.ChatCompletionToolMessageParam)[] = []
  
  for(const message of openaiMessages) {
    finalMessages.push(message)
    
    if('tool_calls' in message && message.tool_calls) {
      for(const toolCall of message.tool_calls) {
        if(toolResults[toolCall.id]) {
          finalMessages.push(toolResults[toolCall.id])
        }
      }
    }
  }
  
  return finalMessages
}

function messageReducer(previous: OpenAI.ChatCompletionMessage, item: OpenAI.ChatCompletionChunk): OpenAI.ChatCompletionMessage {
  const reduce = (acc: any, delta: OpenAI.ChatCompletionChunk.Choice.Delta) => {
    acc = { ...acc };
    for (const [key, value] of Object.entries(delta)) {
      if (acc[key] === undefined || acc[key] === null) {
        acc[key] = value;
        //  OpenAI.Chat.Completions.ChatCompletionMessageToolCall does not have a key, .index
        if (Array.isArray(acc[key])) {
          for (const arr of acc[key]) {
            delete arr.index;
          }
        }
      } else if (typeof acc[key] === 'string' && typeof value === 'string') {
        // Don't concatenate role values, as they should be set only once
        // This fixes a bug where "role":"assistant" appears in multiple chunks
        // and gets concatenated to "role":"assistantassistant"
        if (key === 'role') {
          // Role is already set, don't append
        } else {
          acc[key] += value;
        }
      } else if (typeof acc[key] === 'number' && typeof value === 'number') {
        acc[key] = value;
      } else if (Array.isArray(acc[key]) && Array.isArray(value)) {
        const accArray = acc[key];
        for (let i = 0; i < value.length; i++) {
          const { index, ...chunkTool } = value[i];
          if (index - accArray.length > 1) {
            throw new Error(
              `Error: An array has an empty value when tool_calls are constructed. tool_calls: ${accArray}; tool: ${value}`,
            );
          }
          accArray[index] = reduce(accArray[index], chunkTool);
        }
      } else if (typeof acc[key] === 'object' && typeof value === 'object') {
        acc[key] = reduce(acc[key], value);
      }
    }
    return acc;
  };

  const choice = item.choices?.[0];
  if (!choice) {
    // chunk contains information about usage and token counts
    return previous;
  }
  return reduce(previous, choice.delta) as OpenAI.ChatCompletionMessage;
}
/**
 * Handle OpenAI-style message streams, which require manual accumulation of chunks
 */
async function handleOpenAIMessageStream(
  stream: ChatCompletionStream | AsyncGenerator<any, void, unknown>,
): Promise<OpenAI.ChatCompletion> {
  const streamStartTime = Date.now()
  let ttftMs: number | undefined
  
  let message = {} as OpenAI.ChatCompletionMessage

  let id, model, created, object, usage
  for await (const chunk of stream) {
    if(!id) {
      id = chunk.id
    }
    if(!model) {
      model = chunk.model
    }
    if(!created) {
      created = chunk.created
    }
    if(!object) {
      object = chunk.object
    }
    if(!usage) {
      usage = chunk.usage
    }
    
    // Only process valid chunks
    if (chunk) {
      message = messageReducer(message, chunk);
      if (chunk?.choices?.[0]?.delta?.content) {
        ttftMs = Date.now() - streamStartTime
      }
    }
  }
  return {
    id,
    created,
    model,
    object,
    choices: [ { 
      index: 0, 
      message, 
      finish_reason: 'stop',
      logprobs: undefined,
      },
    ],
    usage,
  }
}

/**
 * Handle Anthropic-style message streams, using SDK's finalMessage() method
 */
async function handleAnthropicMessageStream(
  stream: BetaMessageStream,
): Promise<StreamResponse> {
  const streamStartTime = Date.now()
  let ttftMs: number | undefined

  // Only track the timing, don't try to accumulate message
  for await (const part of stream) {
    if (part.type === 'message_start') {
      ttftMs = Date.now() - streamStartTime
    }
  }

  // Let the Anthropic SDK handle building the complete response
  const finalResponse = await stream.finalMessage()
  return {
    ...finalResponse,
    ttftMs,
  }
}

function convertOpenAIResponseToAnthropic(response: OpenAI.ChatCompletion) {
  let contentBlocks: ContentBlock[] = []
  const message = response.choices?.[0]?.message as ExtendedChatCompletionMessage
  if(!message) {
    logEvent('weird_response', {
      response: JSON.stringify(response),
    })
    return {
      role: 'assistant',
      content: [],
      stop_reason: response.choices?.[0]?.finish_reason,
      type: 'message',
      usage: response.usage,
    }
  }
  
  if(message?.tool_calls) {
    for(const toolCall of message.tool_calls) {
      const tool = toolCall.function
      const toolName = tool.name
      let toolArgs = {}
      try {
        toolArgs = JSON.parse(tool.arguments)
      } catch (e) {
        // console.log(e)
      }

      contentBlocks.push({
        type: 'tool_use',
        input: toolArgs,
        name: toolName,
        id: toolCall.id?.length > 0 ? toolCall.id : nanoid(),
      })
    }
  }


  if(message.reasoning) {
    contentBlocks.push({
      type: 'thinking',
      thinking: message?.reasoning,
      signature: '',
    })
  }

  // NOTE: For deepseek api, the key for its returned reasoning process is reasoning_content 
  if (message.reasoning_content) {
    contentBlocks.push({
      type: 'thinking',
      thinking: message?.reasoning_content,
      signature: '',
    })
  }

  if (message.content) {
    contentBlocks.push({
      type: 'text',
      text: message?.content,
      citations: [],
    })
  }


  const finalMessage = {
    role: 'assistant',
    content: contentBlocks,
    stop_reason: response.choices?.[0]?.finish_reason,
    type: 'message',
    usage: response.usage,
  }

  return finalMessage
}

let anthropicClient: Anthropic | ExtendedAnthropicBedrock | ExtendedAnthropicVertex | null = null

/**
 * Get the Anthropic client, creating it if it doesn't exist
 */
export function getAnthropicClient(model?: string): Anthropic | ExtendedAnthropicBedrock | ExtendedAnthropicVertex {
  // If client exists and provider hasn't changed, reuse it
  const config = getGlobalConfig();
  
  // Reset client if needed for provider change
  if (anthropicClient && config.primaryProvider !== 'anthropic') {
    anthropicClient = null;
  }
  
  if (anthropicClient) {
    return anthropicClient;
  }

  const region = getVertexRegionForModel(model);

  const defaultHeaders: { [key: string]: string } = {
    'x-app': 'cli',
    'User-Agent': USER_AGENT,
  }
  if (process.env.ANTHROPIC_AUTH_TOKEN) {
    defaultHeaders['Authorization'] =
      `Bearer ${process.env.ANTHROPIC_AUTH_TOKEN}`;
  }

  const ARGS = {
    defaultHeaders,
    maxRetries: 0, // Disabled auto-retry in favor of manual implementation
    timeout: parseInt(process.env.API_TIMEOUT_MS || String(60 * 1000), 10),
  }
  
  if (USE_BEDROCK) {
    const client = new AnthropicBedrock(ARGS) as ExtendedAnthropicBedrock;
    anthropicClient = client;
    return client;
  }
  
  if (USE_VERTEX) {
    const vertexArgs = {
      ...ARGS,
      region: region || process.env.CLOUD_ML_REGION || 'us-east5',
    };
    const client = new AnthropicVertex(vertexArgs) as ExtendedAnthropicVertex;
    anthropicClient = client;
    return client;
  }

  // For direct Anthropic API access - use same pattern as other parts of codebase
  const modelType = model?.includes('haiku') ? 'small' : 'large';
  const apiKey = getActiveApiKey(config, modelType);
  
  if (!apiKey) {
    console.error(
      chalk.red(
        'No API key found for Anthropic. Please configure it in the settings.',
      ),
    );
  }
  
  anthropicClient = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
    ...ARGS,
  });
  
  return anthropicClient;
}

/**
 * Reset the Anthropic client to null, forcing a new client to be created on next use
 */
export function resetAnthropicClient(): void {
  anthropicClient = null
}

/**
 * Environment variables for different client types:
 *
 * Direct API:
 * - ANTHROPIC_API_KEY: Required for direct API access
 *
 * AWS Bedrock:
 * - AWS credentials configured via aws-sdk defaults
 *
 * Vertex AI:
 * - Model-specific region variables (highest priority):
 *   - VERTEX_REGION_CLAUDE_3_5_HAIKU: Region for Claude 3.5 Haiku model
 *   - VERTEX_REGION_CLAUDE_3_5_SONNET: Region for Claude 3.5 Sonnet model
 *   - VERTEX_REGION_CLAUDE_3_7_SONNET: Region for Claude 3.7 Sonnet model
 * - CLOUD_ML_REGION: Optional. The default GCP region to use for all models
 *   If specific model region not specified above
 * - ANTHROPIC_VERTEX_PROJECT_ID: Required. Your GCP project ID
 * - Standard GCP credentials configured via google-auth-library
 *
 * Priority for determining region:
 * 1. Hardcoded model-specific environment variables
 * 2. Global CLOUD_ML_REGION variable
 * 3. Default region from config
 * 4. Fallback region (us-east5)
 */

export function userMessageToMessageParam(
  message: UserMessage,
  addCache = false,
): MessageParam {
  if (addCache) {
    if (typeof message.message.content === 'string') {
      return {
        role: 'user',
        content: [
          {
            type: 'text',
            text: message.message.content,
            ...(PROMPT_CACHING_ENABLED
              ? { cache_control: { type: 'ephemeral' } }
              : {}),
          },
        ],
      }
    } else {
      return {
        role: 'user',
        content: message.message.content.map((_, i) => ({
          ..._,
          ...(i === message.message.content.length - 1
            ? PROMPT_CACHING_ENABLED
              ? { cache_control: { type: 'ephemeral' } }
              : {}
            : {}),
        })),
      }
    }
  }
  return {
    role: 'user',
    content: message.message.content,
  }
}

export function assistantMessageToMessageParam(
  message: AssistantMessage,
  addCache = false,
): MessageParam {
  if (addCache) {
    if (typeof message.message.content === 'string') {
      return {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: message.message.content,
            ...(PROMPT_CACHING_ENABLED
              ? { cache_control: { type: 'ephemeral' } }
              : {}),
          },
        ],
      }
    } else {
      return {
        role: 'assistant',
        content: message.message.content.map((_, i) => ({
          ..._,
          ...(i === message.message.content.length - 1 &&
          _.type !== 'thinking' &&
          _.type !== 'redacted_thinking'
            ? PROMPT_CACHING_ENABLED
              ? { cache_control: { type: 'ephemeral' } }
              : {}
            : {}),
        })),
      }
    }
  }
  return {
    role: 'assistant',
    content: message.message.content,
  }
}

function splitSysPromptPrefix(systemPrompt: string[]): string[] {
  // split out the first block of the system prompt as the "prefix" for API
  // to match on in https://console.statsig.com/4aF3Ewatb6xPVpCwxb5nA3/dynamic_configs/claude_cli_system_prompt_prefixes
  const systemPromptFirstBlock = systemPrompt[0] || ''
  const systemPromptRest = systemPrompt.slice(1)
  return [systemPromptFirstBlock, systemPromptRest.join('\n')].filter(Boolean)
}

export async function querySonnet(
  messages: (UserMessage | AssistantMessage)[],
  systemPrompt: string[],
  maxThinkingTokens: number,
  tools: Tool[],
  signal: AbortSignal,
  options: {
    dangerouslySkipPermissions: boolean
    model: string
    prependCLISysprompt: boolean
  },
): Promise<AssistantMessage> {
  return await withVCR(messages, () =>
    querySonnetWithPromptCaching(
      messages,
      systemPrompt,
      maxThinkingTokens,
      tools,
      signal,
      options,
    ),
  )
}

export function formatSystemPromptWithContext(
  systemPrompt: string[],
  context: { [k: string]: string },
): string[] {
  if (Object.entries(context).length === 0) {
    return systemPrompt
  }

  return [
    ...systemPrompt,
    `\nAs you answer the user's questions, you can use the following context:\n`,
    ...Object.entries(context).map(
      ([key, value]) => `<context name="${key}">${value}</context>`,
    ),
  ]
}

async function querySonnetWithPromptCaching(
  messages: (UserMessage | AssistantMessage)[],
  systemPrompt: string[],
  maxThinkingTokens: number,
  tools: Tool[],
  signal: AbortSignal,
  options: {
    dangerouslySkipPermissions: boolean
    model: string
    prependCLISysprompt: boolean
  },
): Promise<AssistantMessage> {
  const config = getGlobalConfig();
  
  // Check if provider is Anthropic to use direct Anthropic implementation
  if (config.primaryProvider === 'anthropic') {
    return queryAnthropicDirectly(messages, systemPrompt, maxThinkingTokens, tools, signal, options);
  }
  
  // For all other providers, use the OpenAI-based implementation
  return queryOpenAI('large', messages, systemPrompt, maxThinkingTokens, tools, signal, options);
}

/**
 * Direct implementation of Anthropic API calls - based on original implementation
 */
async function queryAnthropicDirectly(
  messages: (UserMessage | AssistantMessage)[],
  systemPrompt: string[],
  maxThinkingTokens: number,
  tools: Tool[],
  signal: AbortSignal,
  options: {
    dangerouslySkipPermissions: boolean
    model: string
    prependCLISysprompt: boolean
  },
): Promise<AssistantMessage> {
  const anthropic = getAnthropicClient(options.model);

  // Prepend system prompt block for easy API identification
  if (options.prependCLISysprompt) {
    // Log stats about first block for analyzing prefix matching config
    const [firstSyspromptBlock] = splitSysPromptPrefix(systemPrompt);
    logEvent('tengu_sysprompt_block', {
      snippet: firstSyspromptBlock?.slice(0, 20),
      length: String(firstSyspromptBlock?.length ?? 0),
      hash: firstSyspromptBlock
        ? createHash('sha256').update(firstSyspromptBlock).digest('hex')
        : '',
    });

    systemPrompt = [getCLISyspromptPrefix(), ...systemPrompt];
  }

  const system: TextBlockParam[] = splitSysPromptPrefix(systemPrompt).map(
    _ => ({
      ...(PROMPT_CACHING_ENABLED
        ? { cache_control: { type: 'ephemeral' } }
        : {}),
      text: _,
      type: 'text',
    }),
  );

  const toolSchemas = await Promise.all(
    tools.map(async _ => ({
      name: _.name,
      description: await _.prompt({
        dangerouslySkipPermissions: options.dangerouslySkipPermissions,
      }),
      // Use tool's JSON schema directly if provided, otherwise convert Zod schema
      input_schema: ('inputJSONSchema' in _ && _.inputJSONSchema
        ? _.inputJSONSchema
        : zodToJsonSchema(_.inputSchema)) as any,
    })),
  );

  // Remove beta feature flags as they're causing API errors
  // const betas = ['tool_use:logging=false'];
  // const useBetas = PROMPT_CACHING_ENABLED && betas.length > 0;
  const useBetas = false;
  
  logEvent('tengu_api_query', {
    model: options.model,
    messagesLength: String(
      JSON.stringify([...system, ...messages, ...toolSchemas]).length,
    ),
    temperature: String(MAIN_QUERY_TEMPERATURE),
    provider: USE_BEDROCK ? 'bedrock' : USE_VERTEX ? 'vertex' : '1p',
    // Beta features removed due to API incompatibility
  });

  const startIncludingRetries = Date.now();
  let start = Date.now();
  let attemptNumber = 0;
  let response;
  let stream: any = undefined;
  
  try {
    response = await withRetry(async attempt => {
      attemptNumber = attempt;
      start = Date.now();
      
      // Prepare request parameters
      const requestParams = {
        model: options.model,
        max_tokens: Math.max(
          maxThinkingTokens + 1,
          8192, // Default for most Claude models
        ),
        messages: addCacheBreakpoints(messages),
        temperature: MAIN_QUERY_TEMPERATURE,
        system,
        tools: toolSchemas.length > 0 ? toolSchemas : undefined,
        // Beta features removed due to API incompatibility
        metadata: getMetadata(),
        ...(maxThinkingTokens > 0
          ? {
              thinking: {
                budget_tokens: maxThinkingTokens,
                type: 'enabled',
              },
            }
          : {}),
      };
      
      // Generate a request ID for logging
      const requestId = randomUUID();
      
      // Log API request
      try {
        rawLogger.logApiRequest(
          'anthropic', 
          requestId, 
          `https://api.anthropic.com/v1/messages`,
          'POST',
          { 
            'Content-Type': 'application/json',
            'x-api-key': '***redacted***', // Don't log actual API key
            'anthropic-version': '2023-06-01',
            'User-Agent': USER_AGENT,
          },
          // Clone request to avoid modifying the original
          JSON.parse(JSON.stringify({
            ...requestParams,
            _debug: { 
              provider: 'anthropic',
              modelType: options.model
            }
          }))
        );
      } catch (logError) {
        console.error('Failed to log API request:', logError);
      }
      
      const requestStartTime = Date.now();
      
      // Use Anthropic's streaming API
      const s = anthropic.beta.messages.stream(requestParams, { signal });
      stream = s;
      
      // Store request ID with stream for later reference
      (s as any).requestId = requestId;
      
      // Log streaming start
      try {
        rawLogger.logApiStreamStart('anthropic', requestId);
      } catch (logError) {
        console.error('Failed to log stream start:', logError);
      }
      
      // Process stream using Anthropic-specific handler
      const result = await handleAnthropicMessageStream(s);
      
      // Log successful response
      try {
        const durationMs = Date.now() - requestStartTime;
        rawLogger.logApiResponse(
          'anthropic',
          requestId,
          200, // Assuming success status code
          {}, // Headers not directly available
          result, // The full response object
          durationMs
        );
      } catch (logError) {
        console.error('Failed to log API response:', logError);
      }
      
      return result;
    });
  } catch (error) {
    logError(error);
    
    // Log the error to raw logger
    try {
      const requestId = (stream as any)?.requestId ?? randomUUID();
      const durationMs = Date.now() - start;
      rawLogger.logApiError(
        'anthropic', 
        requestId, 
        {
          error: error instanceof Error ? error.message : String(error),
          status: error instanceof APIError ? error.status : undefined,
          provider: 'anthropic',
          model: options.model,
          messageCount: messages.length,
          attempt: attemptNumber,
        }, 
        durationMs
      );
    } catch (logError) {
      console.error('Failed to log API error:', logError);
    }
    
    logEvent('tengu_api_error', {
      model: options.model,
      error: error instanceof Error ? error.message : String(error),
      status: error instanceof APIError ? String(error.status) : undefined,
      messageCount: String(messages.length),
      messageTokens: String(countTokens(messages)),
      durationMs: String(Date.now() - start),
      durationMsIncludingRetries: String(Date.now() - startIncludingRetries),
      attempt: String(attemptNumber),
      provider: USE_BEDROCK ? 'bedrock' : USE_VERTEX ? 'vertex' : '1p',
      requestId: (stream as any)?.requestId ?? undefined,
    });
    
    // Update session state with error details
    setSessionState('lastApiError', {
      timestamp: Date.now(),
      provider: 'anthropic',
      baseURL: 'https://api.anthropic.com/v1',
      message: error instanceof Error ? error.message : String(error),
      details: error
    });
    
    return getAssistantMessageFromError(error, 'large');
  }
  
  const durationMs = Date.now() - start;
  const durationMsIncludingRetries = Date.now() - startIncludingRetries;
  
  logEvent('tengu_api_success', {
    model: options.model,
    messageCount: String(messages.length),
    messageTokens: String(countTokens(messages)),
    inputTokens: String(response.usage.input_tokens),
    outputTokens: String(response.usage.output_tokens),
    cachedInputTokens: String(
      (response.usage as any).cache_read_input_tokens ?? 0,
    ),
    uncachedInputTokens: String(
      (response.usage as any).cache_creation_input_tokens ?? 0,
    ),
    durationMs: String(durationMs),
    durationMsIncludingRetries: String(durationMsIncludingRetries),
    attempt: String(attemptNumber),
    ttftMs: String(response.ttftMs),
    provider: USE_BEDROCK ? 'bedrock' : USE_VERTEX ? 'vertex' : '1p',
    requestId: (stream as any)?.request_id ?? undefined,
    stop_reason: response.stop_reason ?? undefined,
  });

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const cacheReadInputTokens =
    (response.usage as any).cache_read_input_tokens ?? 0;
  const cacheCreationInputTokens =
    (response.usage as any).cache_creation_input_tokens ?? 0;
  const costUSD =
    (inputTokens / 1_000_000) * SONNET_COST_PER_MILLION_INPUT_TOKENS +
    (outputTokens / 1_000_000) * SONNET_COST_PER_MILLION_OUTPUT_TOKENS +
    (cacheReadInputTokens / 1_000_000) *
      SONNET_COST_PER_MILLION_PROMPT_CACHE_READ_TOKENS +
    (cacheCreationInputTokens / 1_000_000) *
      SONNET_COST_PER_MILLION_PROMPT_CACHE_WRITE_TOKENS;

  addToTotalCost(costUSD, durationMsIncludingRetries);

  // Handle empty content scenarios gracefully
  const normalizedContent = Array.isArray(response.content) 
    ? normalizeContentFromAPI(response.content)
    : [{ type: 'text', text: NO_CONTENT_MESSAGE, citations: [] }];
    
  return {
    message: {
      ...response,
      content: normalizedContent,
      usage: {
        ...response.usage,
        cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
        cache_creation_input_tokens:
          response.usage.cache_creation_input_tokens ?? 0,
      },
    },
    costUSD,
    durationMs,
    type: 'assistant',
    uuid: randomUUID(),
  };
}

function getAssistantMessageFromError(error: unknown, modelType?: 'large' | 'small'): AssistantMessage {
  const config = getGlobalConfig();
  const baseURL = modelType === 'large' ? config.largeModelBaseURL : (modelType === 'small' ? config.smallModelBaseURL : 'unknown');
  
  // Store error details in session state for formatApiErrorMessage to use
  setSessionState('lastApiError', {
    timestamp: Date.now(),
    provider: 'openai', // Protocol
    baseURL: baseURL,   // Actual endpoint base
    message: error instanceof Error ? error.message : String(error),
    details: error
  });

  if (error instanceof Error && error.message.includes('prompt is too long')) {
    return createAssistantAPIErrorMessage(`${PROMPT_TOO_LONG_ERROR_MESSAGE} (${baseURL})`)
  }
  if (
    error instanceof Error &&
    error.message.includes('Your credit balance is too low')
  ) {
    return createAssistantAPIErrorMessage(`${CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE} (${baseURL})`)
  }
  if (
    error instanceof Error &&
    error.message.toLowerCase().includes('x-api-key')
  ) {
    return createAssistantAPIErrorMessage(`${INVALID_API_KEY_ERROR_MESSAGE} (${baseURL})`)
  }
  if (error instanceof Error) {
    if(process.env.NODE_ENV === 'development') {
      console.log(error)
    }
    return createAssistantAPIErrorMessage(
      `${API_ERROR_MESSAGE_PREFIX} from ${baseURL}: ${error.message}`,
    )
  }
  return createAssistantAPIErrorMessage(`${API_ERROR_MESSAGE_PREFIX} from ${baseURL}`)
}

function addCacheBreakpoints(
  messages: (UserMessage | AssistantMessage)[],
): MessageParam[] {
  return messages.map((msg, index) => {
    return msg.type === 'user'
      ? userMessageToMessageParam(msg, index > messages.length - 3)
      : assistantMessageToMessageParam(msg, index > messages.length - 3)
  })
}

async function queryOpenAI(
  modelType: 'large' | 'small',
  messages: (UserMessage | AssistantMessage)[],
  systemPrompt: string[],
  maxThinkingTokens: number,
  tools: Tool[],
  signal: AbortSignal,
  options?: {
    dangerouslySkipPermissions: boolean
    model: string
    prependCLISysprompt: boolean
  },
): Promise<AssistantMessage> {
  // Import here to avoid circular dependency - proper ES Module dynamic import
  // Using static imports from the top of the file
  // No dynamic imports needed, circular dependency is resolved properly
  
  //const anthropic = await getAnthropicClient(options.model)
  const config = getGlobalConfig()
  const model = modelType === 'large' ? config.largeModelName : config.smallModelName
  // Prepend system prompt block for easy API identification
  if (options?.prependCLISysprompt) {
    // Log stats about first block for analyzing prefix matching config (see https://console.statsig.com/4aF3Ewatb6xPVpCwxb5nA3/dynamic_configs/claude_cli_system_prompt_prefixes)
    const [firstSyspromptBlock] = splitSysPromptPrefix(systemPrompt)
    logEvent('tengu_sysprompt_block', {
      snippet: firstSyspromptBlock?.slice(0, 20),
      length: String(firstSyspromptBlock?.length ?? 0),
      hash: firstSyspromptBlock
        ? createHash('sha256').update(firstSyspromptBlock).digest('hex')
        : '',
    })

    systemPrompt = [getCLISyspromptPrefix(), ...systemPrompt]
  }

  const system: TextBlockParam[] = splitSysPromptPrefix(systemPrompt).map(
    _ => ({
      ...(PROMPT_CACHING_ENABLED
        ? { cache_control: { type: 'ephemeral' } }
        : {}),
      text: _,
      type: 'text',
    }),
  )

  const toolSchemas = await Promise.all(
    tools.map(async _ => ({
      type: 'function',
      function: {
        name: _.name,
        description: await _.prompt({
          dangerouslySkipPermissions: options?.dangerouslySkipPermissions,
        }),
        // Use tool's JSON schema directly if provided, otherwise convert Zod schema
        parameters: ('inputJSONSchema' in _ && _.inputJSONSchema
          ? _.inputJSONSchema
          : zodToJsonSchema(_.inputSchema)) ,
      }})as OpenAI.ChatCompletionTool) ,
  )


  const openaiSystem = system.map(s => ({
    role: 'system',
    content: s.text,
  }) as OpenAI.ChatCompletionMessageParam)
  
  const openaiMessages = convertAnthropicMessagesToOpenAIMessages(messages)
  const startIncludingRetries = Date.now()

  let start = Date.now()
  let attemptNumber = 0
  let response

  try {
    response = await withRetry(async attempt => {
      attemptNumber = attempt
      start = Date.now()
      const requestId = randomUUID();
      const opts: OpenAI.ChatCompletionCreateParams = {
        model,
        max_tokens: getMaxTokensForModelType(modelType),
        messages: [...openaiSystem, ...openaiMessages],
        temperature: MAIN_QUERY_TEMPERATURE,
      }
      if(config.stream) {
        (opts as OpenAI.ChatCompletionCreateParams).stream = true
        opts.stream_options = {
          include_usage: true,
        }
      }

      if(toolSchemas.length > 0) {
        opts.tools = toolSchemas
        opts.tool_choice = 'auto'
      }
      const reasoningEffort = await getReasoningEffort(modelType, messages)
      if(reasoningEffort) {
        logEvent('debug_reasoning_effort', {
          effort: reasoningEffort,
        })
        opts.reasoning_effort = reasoningEffort
      }
      
      // Log API request
      try {
        const baseURL = modelType === 'large' ? config.largeModelBaseURL : config.smallModelBaseURL || 'https://api.openai.com';
        rawLogger.logApiRequest(
          'openai', 
          requestId, 
          `${baseURL}/chat/completions`,
          'POST',
          { 
            'Content-Type': 'application/json',
            'X-Base-URL': baseURL // Add baseURL for clarity
          },
          // Clone the request to avoid modifying the original
          JSON.parse(JSON.stringify({
            ...opts,
            _debug: { 
              baseURL,
              provider: config.primaryProvider,
              modelType
            }
          }))
        );
      } catch (logError) {
        console.error('Failed to log API request:', logError);
      }
      
      const requestStartTime = Date.now();
      let s;
      try {
        s = await getCompletion(modelType, opts);
      } catch (error) {
        // Log API error
        try {
          const durationMs = Date.now() - requestStartTime;
          const baseURL = modelType === 'large' ? config.largeModelBaseURL : config.smallModelBaseURL || 'https://api.openai.com';
          rawLogger.logApiError('openai', requestId, {
            ...error,
            baseURL: baseURL,
            endpoint: `${baseURL}/chat/completions`,
            provider: config.primaryProvider,
            modelType: modelType
          }, durationMs);
        } catch (logError) {
          console.error('Failed to log API error:', logError);
        }
        throw error; // Re-throw to be handled by retry logic
      }
      
      let finalResponse;
      if(opts.stream) {
        // For streaming, we'll handle logging inside the stream processor
        const originalStream = s;
        // Create a wrapper stream that logs chunks
        let chunkIndex = 0;
        const wrappedStream = (async function* () {
          try {
            for await (const chunk of originalStream) {
              // Buffer each chunk (not logging immediately)
              try {
                rawLogger.logApiStreamChunk('openai', requestId, chunk, chunkIndex++);
              } catch (logError) {
                console.error('Failed to buffer stream chunk:', logError);
              }
              yield chunk;
            }
            // Log all chunks as one entry when stream is complete
            try {
              rawLogger.logApiStreamComplete('openai', requestId);
            } catch (logError) {
              console.error('Failed to log complete stream:', logError);
            }
          } catch (error) {
            // Log stream error
            try {
              const durationMs = Date.now() - requestStartTime;
              rawLogger.logApiError('openai', requestId, error, durationMs);
              // Still attempt to log any collected chunks before the error
              rawLogger.logApiStreamComplete('openai', requestId);
            } catch (logError) {
              console.error('Failed to log stream error:', logError);
            }
            throw error; // Re-throw
          }
        })();
        
        finalResponse = await handleOpenAIMessageStream(wrappedStream);
      } else {
        finalResponse = s;
      }
      
      // Log API response
      try {
        const durationMs = Date.now() - requestStartTime;
        rawLogger.logApiResponse(
          'openai',
          requestId,
          200, // Status code not directly available, assume success
          {}, // Headers not available
          finalResponse,
          durationMs
        );
      } catch (logError) {
        console.error('Failed to log API response:', logError);
      }

      const r = convertOpenAIResponseToAnthropic(finalResponse)
      return r
    })
  } catch (error) {
    logError(error)
    // Log the overall API error, even after retry attempts
    try {
      const requestId = randomUUID(); // Generate a new request ID for the error
      const durationMs = Date.now() - startIncludingRetries;
      rawLogger.logApiError('openai', requestId, error, durationMs);
    } catch (logError) {
      console.error('Failed to log final API error:', logError);
    }
    return getAssistantMessageFromError(error, modelType)
  }
  const durationMs = Date.now() - start
  const durationMsIncludingRetries = Date.now() - startIncludingRetries

  const inputTokens = response.usage?.prompt_tokens ?? 0
  const outputTokens = response.usage?.completion_tokens ?? 0
  const cacheReadInputTokens = response.usage?.prompt_token_details?.cached_tokens ?? 0
  const cacheCreationInputTokens = response.usage?.prompt_token_details?.cached_tokens ?? 0
  const costUSD =
    (inputTokens / 1_000_000) * SONNET_COST_PER_MILLION_INPUT_TOKENS +
    (outputTokens / 1_000_000) * SONNET_COST_PER_MILLION_OUTPUT_TOKENS +
    (cacheReadInputTokens / 1_000_000) *
      SONNET_COST_PER_MILLION_PROMPT_CACHE_READ_TOKENS +
    (cacheCreationInputTokens / 1_000_000) *
      SONNET_COST_PER_MILLION_PROMPT_CACHE_WRITE_TOKENS

  addToTotalCost(costUSD, durationMsIncludingRetries)

  // Handle empty content scenarios gracefully
  const normalizedContent = Array.isArray(response.content) 
    ? normalizeContentFromAPI(response.content)
    : [{ type: 'text', text: NO_CONTENT_MESSAGE, citations: [] }];
    
  const assistantMessage: AssistantMessage = {
    message: {
      ...response,
      content: normalizedContent,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cache_read_input_tokens: cacheReadInputTokens,
        cache_creation_input_tokens: 0
      },
    },
    costUSD,
    durationMs,
    type: 'assistant',
    uuid: randomUUID(),
  };
  
  // Log the assistant message
  if (config.enableSessionLogging) {
    sessionLogger.logAssistantMessage(
      assistantMessage.uuid,
      model || options?.model || 'unknown',
      assistantMessage.message.content
    );
  }
  
  return assistantMessage;
}

export async function queryHaiku({
  systemPrompt = [],
  userPrompt,
  assistantPrompt,
  enablePromptCaching = false,
  signal,
}: {
  systemPrompt: string[]
  userPrompt: string
  assistantPrompt?: string
  enablePromptCaching?: boolean
  signal?: AbortSignal
}): Promise<AssistantMessage> {
  return await withVCR(
    [
      {
        message: {
          role: 'user',
          content: systemPrompt.map(text => ({ type: 'text', text })),
        },
        type: 'user',
        uuid: randomUUID(),
      },
      {
        message: { role: 'user', content: userPrompt },
        type: 'user',
        uuid: randomUUID(),
      },
    ],
    () => {
      const config = getGlobalConfig();
      
      // Check if provider is Anthropic and route to direct Anthropic implementation
      if (config.primaryProvider === 'anthropic') {
        return enablePromptCaching
          ? queryHaikuWithPromptCaching({
              systemPrompt,
              userPrompt,
              assistantPrompt,
              signal,
            })
          : queryHaikuWithoutPromptCaching({
              systemPrompt,
              userPrompt,
              assistantPrompt,
              signal,
            });
      }
      
      // For non-Anthropic providers, use the OpenAI implementation
      const messages = [
        {
          message: { role: 'user', content: userPrompt },
          type: 'user',
          uuid: randomUUID(),
        }
      ] as (UserMessage | AssistantMessage)[]
      return queryOpenAI('small', messages, systemPrompt, 0, [], signal);
    },
  )
}
function getMaxTokensForModelType(modelType: 'large' | 'small'): number {
  const config = getGlobalConfig()

  let maxTokens

  if (modelType === 'large') {
    maxTokens = config.largeModelMaxTokens
  } else {
    maxTokens = config.smallModelMaxTokens
  }
  
  if(!maxTokens && config.maxTokens) {
    maxTokens = config.maxTokens
  }

  return maxTokens ?? 8000
}

/**
 * Direct implementation for calling Anthropic API with small models
 */
async function queryHaikuWithPromptCaching({
  systemPrompt,
  userPrompt,
  assistantPrompt,
  signal,
}: {
  systemPrompt: string[]
  userPrompt: string
  assistantPrompt?: string
  signal?: AbortSignal
}): Promise<AssistantMessage> {
  // Use the provider-aware model selection
  const smallModel = getSmallFastModel();
  const anthropic = getAnthropicClient(smallModel);
  
  const messages = [
    {
      role: 'user' as const,
      content: userPrompt,
    },
    ...(assistantPrompt
      ? [{ role: 'assistant' as const, content: assistantPrompt }]
      : []),
  ];

  const system: TextBlockParam[] = splitSysPromptPrefix(systemPrompt).map(
    _ => ({
      ...(PROMPT_CACHING_ENABLED
        ? { cache_control: { type: 'ephemeral' } }
        : {}),
      text: _,
      type: 'text',
    }),
  );

  logEvent('tengu_api_query', {
    model: smallModel,
    messagesLength: String(JSON.stringify([...system, ...messages]).length),
    provider: USE_BEDROCK ? 'bedrock' : USE_VERTEX ? 'vertex' : '1p',
  });
  
  let attemptNumber = 0;
  let start = Date.now();
  const startIncludingRetries = Date.now();
  let response: StreamResponse;
  let stream: any = undefined;
  
  try {
    response = await withRetry(async attempt => {
      attemptNumber = attempt;
      start = Date.now();
      
      // Prepare request parameters
      const requestParams = {
        model: smallModel,
        max_tokens: 512,
        messages,
        system,
        temperature: 0,
        metadata: getMetadata(),
        stream: true,
      };
      
      // Generate a request ID for logging
      const requestId = randomUUID();
      
      // Log API request
      try {
        rawLogger.logApiRequest(
          'anthropic', 
          requestId, 
          `https://api.anthropic.com/v1/messages`,
          'POST',
          { 
            'Content-Type': 'application/json',
            'x-api-key': '***redacted***', // Don't log actual API key
            'anthropic-version': '2023-06-01',
            'User-Agent': USER_AGENT,
          },
          // Clone request to avoid modifying the original
          JSON.parse(JSON.stringify({
            ...requestParams,
            _debug: { 
              provider: 'anthropic',
              modelType: 'small'
            }
          }))
        );
      } catch (logError) {
        console.error('Failed to log API request:', logError);
      }
      
      const requestStartTime = Date.now();
      
      // Use Anthropic's streaming API
      const s = anthropic.beta.messages.stream(requestParams, { signal });
      stream = s;
      
      // Store request ID with stream for later reference
      (s as any).requestId = requestId;
      
      // Log streaming start
      try {
        rawLogger.logApiStreamStart('anthropic', requestId);
      } catch (logError) {
        console.error('Failed to log stream start:', logError);
      }
      
      // Process the stream
      const result = await handleAnthropicMessageStream(s);
      
      // Log successful response
      try {
        const durationMs = Date.now() - requestStartTime;
        rawLogger.logApiResponse(
          'anthropic',
          requestId,
          200, // Assuming success status code
          {}, // Headers not directly available
          result, // The full response object
          durationMs
        );
      } catch (logError) {
        console.error('Failed to log API response:', logError);
      }
      
      return result;
    });
  } catch (error) {
    logError(error);
    
    // Log the error to raw logger
    try {
      const requestId = (stream as any)?.requestId ?? randomUUID();
      const durationMs = Date.now() - start;
      rawLogger.logApiError(
        'anthropic', 
        requestId, 
        {
          error: error instanceof Error ? error.message : String(error),
          status: error instanceof APIError ? error.status : undefined,
          provider: 'anthropic',
          model: smallModel,
          messageCount: assistantPrompt ? 2 : 1,
          attempt: attemptNumber,
        }, 
        durationMs
      );
    } catch (logError) {
      console.error('Failed to log API error:', logError);
    }
    
    logEvent('tengu_api_error', {
      error: error instanceof Error ? error.message : String(error),
      status: error instanceof APIError ? String(error.status) : undefined,
      model: smallModel,
      messageCount: String(assistantPrompt ? 2 : 1),
      durationMs: String(Date.now() - start),
      durationMsIncludingRetries: String(Date.now() - startIncludingRetries),
      attempt: String(attemptNumber),
      provider: USE_BEDROCK ? 'bedrock' : USE_VERTEX ? 'vertex' : '1p',
      requestId: (stream as any)?.requestId ?? undefined,
    });
    
    // Update session state with error details
    setSessionState('lastApiError', {
      timestamp: Date.now(),
      provider: 'anthropic',
      baseURL: 'https://api.anthropic.com/v1',
      message: error instanceof Error ? error.message : String(error),
      details: error
    });
    
    return getAssistantMessageFromError(error, 'small');
  }

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const cacheReadInputTokens = response.usage.cache_read_input_tokens ?? 0;
  const cacheCreationInputTokens = response.usage.cache_creation_input_tokens ?? 0;
  const costUSD =
    (inputTokens / 1_000_000) * HAIKU_COST_PER_MILLION_INPUT_TOKENS +
    (outputTokens / 1_000_000) * HAIKU_COST_PER_MILLION_OUTPUT_TOKENS +
    (cacheReadInputTokens / 1_000_000) *
      HAIKU_COST_PER_MILLION_PROMPT_CACHE_READ_TOKENS +
    (cacheCreationInputTokens / 1_000_000) *
      HAIKU_COST_PER_MILLION_PROMPT_CACHE_WRITE_TOKENS;

  const durationMs = Date.now() - start;
  const durationMsIncludingRetries = Date.now() - startIncludingRetries;
  addToTotalCost(costUSD, durationMsIncludingRetries);

  // Handle empty content scenarios gracefully
  const normalizedContent = Array.isArray(response.content) 
    ? normalizeContentFromAPI(response.content)
    : [{ type: 'text', text: NO_CONTENT_MESSAGE, citations: [] }];
    
  const assistantMessage: AssistantMessage = {
    durationMs,
    message: {
      ...response,
      content: normalizedContent,
    },
    costUSD,
    uuid: randomUUID(),
    type: 'assistant',
  };

  logEvent('tengu_api_success', {
    model: smallModel,
    messageCount: String(assistantPrompt ? 2 : 1),
    inputTokens: String(inputTokens),
    outputTokens: String(response.usage.output_tokens),
    cachedInputTokens: String(response.usage.cache_read_input_tokens ?? 0),
    uncachedInputTokens: String(response.usage.cache_creation_input_tokens ?? 0),
    durationMs: String(durationMs),
    durationMsIncludingRetries: String(durationMsIncludingRetries),
    ttftMs: String(response.ttftMs),
    provider: USE_BEDROCK ? 'bedrock' : USE_VERTEX ? 'vertex' : '1p',
    requestId: (stream as any)?.request_id ?? undefined,
    stop_reason: response.stop_reason ?? undefined,
  });

  return assistantMessage;
}

/**
 * Direct implementation for calling Anthropic API with small models without prompt caching
 */
async function queryHaikuWithoutPromptCaching({
  systemPrompt,
  userPrompt,
  assistantPrompt,
  signal,
}: {
  systemPrompt: string[]
  userPrompt: string
  assistantPrompt?: string
  signal?: AbortSignal
}): Promise<AssistantMessage> {
  // Use the provider-aware model selection
  const smallModel = getSmallFastModel();
  const anthropic = getAnthropicClient(smallModel);
  
  const messages = [
    { role: 'user' as const, content: userPrompt },
    ...(assistantPrompt
      ? [{ role: 'assistant' as const, content: assistantPrompt }]
      : []),
  ];
  
  logEvent('tengu_api_query', {
    model: smallModel,
    messagesLength: String(JSON.stringify([{ systemPrompt }, ...messages]).length),
    provider: USE_BEDROCK ? 'bedrock' : USE_VERTEX ? 'vertex' : '1p',
  });

  let attemptNumber = 0;
  let start = Date.now();
  const startIncludingRetries = Date.now();
  let response: StreamResponse;
  let stream: any = undefined;
  
  try {
    response = await withRetry(async attempt => {
      attemptNumber = attempt;
      start = Date.now();
      
      // Prepare request parameters
      const requestParams = {
        model: smallModel,
        max_tokens: 512,
        messages,
        system: splitSysPromptPrefix(systemPrompt).map(text => ({
          type: 'text',
          text,
        })),
        temperature: 0,
        metadata: getMetadata(),
        stream: true,
      };
      
      // Generate a request ID for logging
      const requestId = randomUUID();
      
      // Log API request
      try {
        rawLogger.logApiRequest(
          'anthropic', 
          requestId, 
          `https://api.anthropic.com/v1/messages`,
          'POST',
          { 
            'Content-Type': 'application/json',
            'x-api-key': '***redacted***', // Don't log actual API key
            'anthropic-version': '2023-06-01',
            'User-Agent': USER_AGENT,
          },
          // Clone request to avoid modifying the original
          JSON.parse(JSON.stringify({
            ...requestParams,
            _debug: { 
              provider: 'anthropic',
              modelType: 'small'
            }
          }))
        );
      } catch (logError) {
        console.error('Failed to log API request:', logError);
      }
      
      const requestStartTime = Date.now();
      
      // Use Anthropic's streaming API
      const s = anthropic.beta.messages.stream(requestParams, { signal });
      stream = s;
      
      // Store request ID with stream for later reference
      (s as any).requestId = requestId;
      
      // Log streaming start
      try {
        rawLogger.logApiStreamStart('anthropic', requestId);
      } catch (logError) {
        console.error('Failed to log stream start:', logError);
      }
      
      // Process the stream
      const result = await handleAnthropicMessageStream(s);
      
      // Log successful response
      try {
        const durationMs = Date.now() - requestStartTime;
        rawLogger.logApiResponse(
          'anthropic',
          requestId,
          200, // Assuming success status code
          {}, // Headers not directly available
          result, // The full response object
          durationMs
        );
      } catch (logError) {
        console.error('Failed to log API response:', logError);
      }
      
      return result;
    });
  } catch (error) {
    logError(error);
    
    // Log the error to raw logger
    try {
      const requestId = (stream as any)?.requestId ?? randomUUID();
      const durationMs = Date.now() - start;
      rawLogger.logApiError(
        'anthropic', 
        requestId, 
        {
          error: error instanceof Error ? error.message : String(error),
          status: error instanceof APIError ? error.status : undefined,
          provider: 'anthropic',
          model: smallModel,
          messageCount: assistantPrompt ? 2 : 1,
          attempt: attemptNumber,
        }, 
        durationMs
      );
    } catch (logError) {
      console.error('Failed to log API error:', logError);
    }
    
    logEvent('tengu_api_error', {
      error: error instanceof Error ? error.message : String(error),
      status: error instanceof APIError ? String(error.status) : undefined,
      model: smallModel,
      messageCount: String(assistantPrompt ? 2 : 1),
      durationMs: String(Date.now() - start),
      durationMsIncludingRetries: String(Date.now() - startIncludingRetries),
      attempt: String(attemptNumber),
      provider: USE_BEDROCK ? 'bedrock' : USE_VERTEX ? 'vertex' : '1p',
      requestId: (stream as any)?.requestId ?? undefined,
    });
    
    // Update session state with error details
    setSessionState('lastApiError', {
      timestamp: Date.now(),
      provider: 'anthropic',
      baseURL: 'https://api.anthropic.com/v1',
      message: error instanceof Error ? error.message : String(error),
      details: error
    });
    
    return getAssistantMessageFromError(error, 'small');
  }
  
  const durationMs = Date.now() - start;
  const durationMsIncludingRetries = Date.now() - startIncludingRetries;
  
  logEvent('tengu_api_success', {
    model: smallModel,
    messageCount: String(assistantPrompt ? 2 : 1),
    inputTokens: String(response.usage.input_tokens),
    outputTokens: String(response.usage.output_tokens),
    durationMs: String(durationMs),
    durationMsIncludingRetries: String(durationMsIncludingRetries),
    attempt: String(attemptNumber),
    provider: USE_BEDROCK ? 'bedrock' : USE_VERTEX ? 'vertex' : '1p',
    requestId: (stream as any)?.request_id ?? undefined,
    stop_reason: response.stop_reason ?? undefined,
  });

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const costUSD =
    (inputTokens / 1_000_000) * HAIKU_COST_PER_MILLION_INPUT_TOKENS +
    (outputTokens / 1_000_000) * HAIKU_COST_PER_MILLION_OUTPUT_TOKENS;

  addToTotalCost(costUSD, durationMs);

  // Handle empty content scenarios gracefully
  const normalizedContent = Array.isArray(response.content) 
    ? normalizeContentFromAPI(response.content)
    : [{ type: 'text', text: NO_CONTENT_MESSAGE, citations: [] }];
  
  const assistantMessage: AssistantMessage = {
    durationMs,
    message: {
      ...response,
      content: normalizedContent,
      usage: {
        ...response.usage,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      },
    },
    costUSD,
    type: 'assistant',
    uuid: randomUUID(),
  };

  return assistantMessage;
}
