import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat';

import { ENV, Env } from '../config/env';
import { Completion, ToolCall, ToolSpec, Turn } from './llm.types';

const REQUEST_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;

/**
 * The model, behind one method.
 *
 * Z.ai speaks the OpenAI wire protocol, so this is the official `openai` SDK
 * pointed at a different baseURL — swapping providers is a config change, not
 * a code change. Callers never see OpenAI's message shapes.
 */
@Injectable()
export class GlmClient {
  private readonly logger = new Logger(GlmClient.name);
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(@Inject(ENV) env: Env) {
    this.client = new OpenAI({
      apiKey: env.glmApiKey,
      baseURL: env.glmBaseUrl,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: MAX_RETRIES,
    });
    this.model = env.glmModel;
  }

  async complete(turns: Turn[], tools: ToolSpec[]): Promise<Completion> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: turns.map(toOpenAiMessage),
      tools: tools.map(toOpenAiTool),
      temperature: 0.3,
      // Z.ai extension, not in the OpenAI schema. GLM reasoning models
      // otherwise spend their whole turn in `reasoning_content` and return an
      // empty `content` — and this assistant has nothing to reason about that
      // is worth doubling the latency for.
      ...({ thinking: { type: 'disabled' } } as Record<string, unknown>),
    });

    const choice = response.choices[0];
    const message = choice?.message;
    const usage = response.usage;
    this.logger.debug(`in=${usage?.prompt_tokens ?? '?'} out=${usage?.completion_tokens ?? '?'}`);

    const completion: Completion = {
      text: message?.content?.trim() ?? '',
      toolCalls: (message?.tool_calls ?? []).flatMap(toToolCall),
    };

    // A turn with neither words nor an action is a bug worth seeing, not a
    // silent fallback message to the user. Reasoning models can still land
    // here if GLM_MODEL is pointed at one, so salvage the monologue rather
    // than telling the user nothing.
    if (completion.text === '' && completion.toolCalls.length === 0) {
      this.logger.warn(
        `Empty completion: finish_reason=${choice?.finish_reason} ` +
          `keys=${Object.keys(message ?? {}).join(',')}`,
      );
      completion.text = reasoningOf(message).trim();
    }

    return completion;
  }
}

/** `reasoning_content` is a Z.ai field the OpenAI types don't describe. */
function reasoningOf(message: unknown): string {
  if (typeof message !== 'object' || message === null) return '';
  const reasoning = (message as { reasoning_content?: unknown }).reasoning_content;
  return typeof reasoning === 'string' ? reasoning : '';
}

function toOpenAiMessage(turn: Turn): ChatCompletionMessageParam {
  if (turn.role === 'tool') {
    return { role: 'tool', tool_call_id: turn.toolCallId, content: turn.content };
  }

  if (turn.role === 'assistant' && 'toolCalls' in turn) {
    return {
      role: 'assistant',
      content: turn.content || null,
      tool_calls: turn.toolCalls.map((call) => ({
        id: call.id,
        type: 'function' as const,
        function: { name: call.name, arguments: call.rawArguments },
      })),
    };
  }

  return { role: turn.role, content: turn.content };
}

function toOpenAiTool(spec: ToolSpec): ChatCompletionTool {
  return {
    type: 'function',
    function: { name: spec.name, description: spec.description, parameters: spec.parameters },
  };
}

type RawToolCall = NonNullable<
  OpenAI.Chat.Completions.ChatCompletionMessage['tool_calls']
>[number];

/** Non-function tool calls (web search, etc.) aren't used here, so drop them. */
function toToolCall(raw: RawToolCall): ToolCall[] {
  if (raw.type !== 'function') return [];
  return [{ id: raw.id, name: raw.function.name, rawArguments: raw.function.arguments }];
}
